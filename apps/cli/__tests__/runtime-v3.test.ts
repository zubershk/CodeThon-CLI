import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { AgentStateMachine } from '../src/core/agent-state';
import { RuntimeEventBus } from '../src/events/event-bus';
import { ExecutionJournal } from '../src/journal/execution-journal';
import { AgentRuntime } from '../src/runtime/agent-runtime';

describe('V3 runtime primitives', () => {
  it('tracks deterministic state transitions', () => {
    const machine = new AgentStateMachine();

    machine.transition('ANALYZING', 'start');
    machine.transition('CHECKPOINTING', 'checkpoint');
    machine.transition('PLANNING', 'plan');
    machine.transition('EXECUTING', 'tool');
    machine.transition('COMPLETED', 'done');

    expect(machine.current()).toBe('COMPLETED');
    expect(machine.history().map(item => item.to)).toEqual([
      'ANALYZING',
      'CHECKPOINTING',
      'PLANNING',
      'EXECUTING',
      'COMPLETED',
    ]);
  });

  it('persists and replays runtime events', () => {
    const seen: string[] = [];
    const persisted: string[] = [];
    const bus = new RuntimeEventBus(event => persisted.push(event.type));
    bus.subscribe(event => seen.push(event.message));

    bus.emit({
      id: '1',
      runId: 'run',
      type: 'TASK_STARTED',
      timestamp: new Date().toISOString(),
      message: 'started',
    });

    const replayed: string[] = [];
    bus.replay(event => replayed.push(event.type));

    expect(seen).toEqual(['started']);
    expect(persisted).toEqual(['TASK_STARTED']);
    expect(replayed).toEqual(['TASK_STARTED']);
  });

  it('creates a persistent journal and completion receipt events', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'codethon-runtime-v3-'));
    try {
      const runtime = new AgentRuntime({ cwd, command: 'execute', goal: 'make demo.txt' });
      runtime.start();
      runtime.handleStatus({
        iteration: 0,
        phase: 'tool_result',
        description: 'write_file',
        done: false,
        toolResult: {
          id: '1',
          tool: 'write_file',
          output: 'Wrote demo.txt (5 bytes)',
          elapsed: 1,
        },
      });
      runtime.handleStatus({
        iteration: 0,
        phase: 'done',
        description: 'demo.txt created',
        done: true,
        receipt: {
          success: true,
          reason: 'artifact_verified',
          summary: 'demo.txt created',
          elapsed: 1,
          artifacts: [{ path: 'demo.txt', bytes: 5, dryRun: false }],
          checks: [],
          errors: [],
          toolCount: 1,
        },
      });

      const runs = ExecutionJournal.list(cwd);
      expect(runs).toHaveLength(1);
      expect(runs[0].status).toBe('completed');

      const events = ExecutionJournal.readEvents(cwd, runs[0].runId);
      expect(events.some(event => event.type === 'FILE_UPDATED')).toBe(true);
      expect(events.some(event => event.type === 'TASK_COMPLETED')).toBe(true);
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});
