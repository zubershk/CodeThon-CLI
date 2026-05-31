import path from 'path';
import { AgentStateMachine } from '../core/agent-state';
import type { AgentState } from '../core/agent-state';
import { RuntimeEventBus } from '../events/event-bus';
import type { RuntimeEvent, RuntimeEventType } from '../events/types';
import type { ExecutionContextSnapshot } from '../context/execution-context';
import { ExecutionJournal } from '../journal/execution-journal';
import type { ExecutionRunMeta } from '../journal/execution-journal';
import { CheckpointStore } from '../checkpoints/checkpoint-store';
import { SessionManager } from '../sessions/session-manager';
import type { JobResult, JobStatus } from '../cil/job-loop';
import type { ToolCall, ToolResult } from '../cil/tools';

export interface AgentRuntimeOptions {
  cwd: string;
  command: string;
  goal: string;
}

export class AgentRuntime {
  readonly bus: RuntimeEventBus;
  readonly journal: ExecutionJournal;
  readonly checkpointStore: CheckpointStore;
  readonly meta: ExecutionRunMeta;
  private readonly state = new AgentStateMachine();
  private completed = false;

  constructor(private readonly options: AgentRuntimeOptions) {
    this.meta = new SessionManager(options.cwd).create(options.command, options.goal);
    this.journal = new ExecutionJournal(options.cwd, this.meta);
    this.checkpointStore = new CheckpointStore(options.cwd);
    this.bus = new RuntimeEventBus(event => this.journal.append(event));
  }

  start(): void {
    this.emit('TASK_STARTED', `Started ${this.options.command}: ${this.options.goal}`, { data: { goal: this.options.goal } });
    this.transition('ANALYZING', 'runtime started');
    this.saveCheckpoint('runtime-started');
  }

  modelActivity(chars: number): void {
    if (this.completed) return;
    this.emit('MODEL_CALLED', `Model streaming planning output (${chars.toLocaleString()} chars)`, {
      data: { chars },
    });
  }

  contextBuilt(snapshot: ExecutionContextSnapshot): void {
    if (this.completed) return;
    this.transition('BUILDING_CONTEXT', 'execution context snapshot built');
    this.emit('CONTEXT_BUILT', snapshot.summary, {
      data: { snapshot },
    });
  }

  handleStatus(status: JobStatus): void {
    if (this.completed) return;

    if (status.phase === 'plan' && !status.done) {
      this.transition('PLANNING', `planning iteration ${status.iteration + 1}`);
      this.emit('PLAN_CREATED', `Planning step ${status.iteration + 1}`, {
        iteration: status.iteration + 1,
        data: { evidence: status.evidence },
      });
      this.saveCheckpoint('planning', { iteration: status.iteration + 1 });
      return;
    }

    if (status.phase === 'tool_call' && status.toolCall) {
      this.transition(this.stateForTool(status.toolCall), `running ${status.toolCall.tool}`);
      this.emit('TOOL_STARTED', this.describeToolCall(status.toolCall), {
        iteration: status.iteration + 1,
        tool: status.toolCall.tool,
        target: this.targetFromToolCall(status.toolCall),
        data: { args: status.toolCall.args },
      });
      return;
    }

    if (status.phase === 'tool_result' && status.toolResult) {
      this.recordToolResult(status.toolResult, status.iteration + 1);
      this.saveCheckpoint('tool-result', { iteration: status.iteration + 1, evidence: status.evidence });
      return;
    }

    if (status.phase === 'done') {
      if (status.error) {
        this.transition('FAILED', status.error);
        this.emit('TASK_FAILED', status.error, { iteration: status.iteration + 1, data: { receipt: status.receipt } });
        this.journal.complete('failed', status.error);
        this.completed = true;
        return;
      }

      this.transition('COMPLETED', 'completion receipt created');
      this.emit('RECEIPT_CREATED', status.description || 'Completion receipt created', {
        iteration: status.iteration + 1,
        data: { receipt: status.receipt },
      });
      this.emit('TASK_COMPLETED', status.description || 'Task completed', {
        iteration: status.iteration + 1,
        data: { receipt: status.receipt },
      });
      this.journal.complete('completed', status.description || 'Task completed');
      this.checkpointStore.clear();
      this.completed = true;
    }
  }

  complete(result: JobResult): void {
    if (this.completed) return;

    if (result.success) {
      this.transition('COMPLETED', 'job loop returned success');
      this.emit('TASK_COMPLETED', result.summary || 'Task completed', { data: { receipt: result.receipt } });
      this.journal.complete('completed', result.summary || 'Task completed');
      this.checkpointStore.clear();
      this.completed = true;
      return;
    }

    const interrupted = /interrupt|cancel/i.test(result.summary || '') || result.errors.some(error => /interrupt|cancel/i.test(error));
    if (interrupted) {
      this.cancel(result.summary || 'Execution interrupted by user.');
      return;
    }

    this.transition('FAILED', 'job loop returned incomplete');
    this.emit('TASK_FAILED', result.summary || 'Task incomplete', { data: { errors: result.errors, receipt: result.receipt } });
    this.journal.complete('failed', result.summary || 'Task incomplete');
    this.saveCheckpoint('failed', { result });
    this.completed = true;
  }

  cancel(reason: string): void {
    if (this.completed) return;
    this.transition('CANCELLED', reason);
    this.emit('TASK_CANCELLED', reason);
    this.journal.complete('cancelled', reason);
    this.saveCheckpoint('cancelled', { reason });
    this.completed = true;
  }

  private transition(to: AgentState, reason: string): void {
    const from = this.state.current();
    let transition;
    try {
      transition = this.state.transition(to, reason);
    } catch {
      transition = this.state.transition('FAILED', `invalid transition from ${from} to ${to}: ${reason}`);
    }
    this.emit('STATE_CHANGED', `${transition.from} -> ${transition.to}: ${reason}`, {
      previousState: transition.from,
      state: transition.to,
      data: { reason },
    });
  }

  private recordToolResult(result: ToolResult, iteration: number): void {
    const ok = !result.error;
    const type: RuntimeEventType = ok ? 'TOOL_COMPLETED' : 'TOOL_FAILED';
    this.emit(type, this.describeToolResult(result), {
      iteration,
      tool: result.tool,
      durationMs: (result.elapsed || 0) * 1000,
      target: this.targetFromToolResult(result),
      data: { output: this.trimOutput(result.output), error: result.error },
    });

    if (result.tool === 'write_file' && ok) {
      this.emit('FILE_UPDATED', this.describeToolResult(result), {
        iteration,
        tool: result.tool,
        target: this.targetFromToolResult(result),
      });
    }

    if (result.tool === 'read_file' && ok) {
      this.emit('FILE_READ', this.describeToolResult(result), {
        iteration,
        tool: result.tool,
        target: this.targetFromToolResult(result),
      });
    }

    if (result.tool === 'run_command') {
      this.emit(ok ? 'COMMAND_EXECUTED' : 'COMMAND_FAILED', this.describeToolResult(result), {
        iteration,
        tool: result.tool,
        durationMs: (result.elapsed || 0) * 1000,
        data: { output: this.trimOutput(result.output), error: result.error },
      });
    }
  }

  private saveCheckpoint(reason: string, data: Record<string, unknown> = {}): void {
    this.transition('CHECKPOINTING', reason);
    const checkpoint = {
      runId: this.meta.runId,
      goal: this.options.goal,
      state: this.state.current(),
      savedAt: new Date().toISOString(),
      journalDir: this.journal.paths.runDir,
      data,
    };
    this.journal.checkpoint(checkpoint);
    this.checkpointStore.save(checkpoint);
    this.emit('CHECKPOINT_CREATED', `Checkpoint saved: ${reason}`, { data: checkpoint });
  }

  private emit(type: RuntimeEventType, message: string, extra: Partial<RuntimeEvent> = {}): void {
    this.bus.emit({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      runId: this.meta.runId,
      timestamp: new Date().toISOString(),
      type,
      message,
      ...extra,
    });
  }

  private stateForTool(call: ToolCall): AgentState {
    if (call.tool === 'run_command') return /test|build|typecheck|lint|check/i.test(String(call.args?.command || '')) ? 'VERIFYING' : 'EXECUTING';
    if (call.tool === 'write_file') return 'EXECUTING';
    return 'UNDERSTANDING_REPOSITORY';
  }

  private describeToolCall(call: ToolCall): string {
    const target = this.targetFromToolCall(call);
    return target ? `${call.tool.replace(/_/g, ' ')}: ${target}` : call.tool.replace(/_/g, ' ');
  }

  private describeToolResult(result: ToolResult): string {
    const output = (result.output || '').split(/\r?\n/).find(Boolean)?.trim();
    if (result.error) return `${result.tool.replace(/_/g, ' ')} failed: ${result.error}`;
    return output || `${result.tool.replace(/_/g, ' ')} completed`;
  }

  private targetFromToolCall(call: ToolCall): string | undefined {
    const args = call.args || {};
    for (const key of ['path', 'file', 'filePath', 'filename', 'target', 'url', 'query', 'command']) {
      if (typeof args[key] === 'string' && args[key].trim()) return args[key].trim();
    }
    return undefined;
  }

  private targetFromToolResult(result: ToolResult): string | undefined {
    const line = (result.output || '').split(/\r?\n/).find(Boolean)?.trim();
    if (!line) return undefined;
    const wrote = line.match(/^Wrote\s+(.+?)\s+\(/i);
    if (wrote) return wrote[1];
    const read = line.match(/^(.+?)\s+\(\d+\s+lines\)/i);
    if (read) return read[1];
    return undefined;
  }

  private trimOutput(output: string): string {
    const clean = (output || '').replace(/\r/g, '').trim();
    return clean.length > 1200 ? `${clean.slice(0, 1200)}\n...truncated` : clean;
  }

  journalPathForDisplay(): string {
    return path.relative(this.options.cwd, this.journal.paths.runDir) || this.journal.paths.runDir;
  }
}
