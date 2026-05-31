import type { CommandResult } from '@codethon/shared-types';
import { JobLoop } from '../cil/job-loop';
import type { JobStatus } from '../cil/job-loop';
import type { ToolCall, ToolResult } from '../cil/tools';
import type { ExecutionReceipt, ExecutionSnapshot } from '../cil/execution-ledger';
import { AgentRuntime } from '../runtime/agent-runtime';
import { buildExecutionContextSnapshot, formatExecutionContextForPrompt, type ExecutionContextSnapshot } from '../context/execution-context';
import type { RuntimeEvent } from '../events/types';
import { renderExecuteStart, renderRuntimeEventLine } from '../ui/supernova';
import { V4WorkspaceRenderer } from '../tui/v4-workspace';
import { getLLMConfig } from '../utils/config';
import { logger } from '../utils';
import { renderAgentOutput } from '../utils/render';
import { TerminalRenderer } from '../ui/terminal-renderer';
import { theme } from '../ui/theme';
import { stripAnsi, truncateText, wrapText } from '../ui/terminal-text';

const HUMAN_TOOL: Record<string, string> = {
  read_file: 'read file',
  write_file: 'write file',
  run_command: 'command',
  list_directory: 'project scan',
  search_files: 'file search',
  grep_search: 'code search',
  web_search: 'web search',
  crawl_url: 'web page read',
};

const MIN_RENDER_WIDTH = 72;
const MIN_RENDER_HEIGHT = 24;
const MAX_ACTIVITY_LINES = 6;
const MAX_PREVIEW_CHARS = 6000;
const INTERRUPT_DEBOUNCE_MS = 750;

type PreviewMode = 'assistant' | 'message';
type AgentRole = 'Planner' | 'Scout' | 'Research' | 'Builder' | 'Verifier' | 'Recovery';
type AgentEventState = 'active' | 'queued' | 'success' | 'warn' | 'muted';
type DashboardTone = 'active' | 'queued' | 'success' | 'warn' | 'idle' | 'muted';

const AGENT_ROLES: AgentRole[] = ['Planner', 'Scout', 'Research', 'Builder', 'Verifier'];

function fmtTime(seconds?: number): string {
  if (seconds == null) return '';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function ringTerminal(): void {
  if (!process.stdout.isTTY || process.env.CODETHON_NOTIFY === '0') return;
  process.stdout.write('\x07');
}

function notifyExecutionResult(result: { success: boolean; iterations: number; elapsed: number; summary: string; receipt?: ExecutionReceipt }): void {
  ringTerminal();
  const status = result.success ? 'Execution complete' : 'Execution incomplete';
  const detail = `${result.iterations} step${result.iterations === 1 ? '' : 's'} · ${fmtTime(result.elapsed) || '0s'}`;

  if (result.success) {
    logger.success(`${status} · ${detail}`);
    const delivered = result.receipt?.artifacts
      .filter(artifact => !artifact.dryRun)
      .map(artifact => formatPath(artifact.path, 40))
      .slice(0, 4);
    if (delivered && delivered.length > 0) {
      logger.info(`Delivered: ${delivered.join(', ')}`);
    }
    return;
  }

  logger.warn(`${status} · ${detail}`);
}

function progressBar(progress: number, width: number): string {
  const safeWidth = Math.max(8, width);
  const clamped = Math.max(0, Math.min(1, progress));
  const filled = Math.round(clamped * safeWidth);
  return `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, safeWidth - filled))}`;
}

function pushActivity(lines: string[], line: string): void {
  const clean = stripAnsi(line).trim();
  if (!clean) return;
  lines.push(clean);
  if (lines.length > MAX_ACTIVITY_LINES) {
    lines.splice(0, lines.length - MAX_ACTIVITY_LINES);
  }
}

function pickStringArg(args: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value)) {
      const found = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
      if (found) return found.trim();
    }
  }
  return null;
}

function terminalWidth(max = 110): number {
  return Math.max(64, Math.min(max, (process.stdout.columns || 92) - 4));
}

function formatCommand(value: string, width = 72): string {
  return truncateText(value.replace(/\s+/g, ' ').trim(), width);
}

function formatPath(value: string | null, width = 72): string {
  if (!value) return '';
  const normalized = value.replace(/\\/g, '/');
  const cwd = process.cwd().replace(/\\/g, '/');
  const relative = normalized.startsWith(cwd)
    ? normalized.slice(cwd.length).replace(/^\/+/, '')
    : normalized;
  return truncateText(relative || '.', width);
}

function drawRunPanel(rows: Array<[string, string]>, width: number): void {
  const innerWidth = width - 4;
  const top = `╭${'─'.repeat(width - 2)}╮`;
  const bottom = `╰${'─'.repeat(width - 2)}╯`;
  console.log(`  ${theme.style(top, 'border')}`);
  for (const [label, value] of rows) {
    const left = `${label.padEnd(9)} `;
    const content = truncateText(`${left}${value}`, innerWidth);
    console.log(`  ${theme.style('│', 'border')} ${theme.style(left, 'accent', 'bold')}${theme.style(content.slice(left.length).padEnd(Math.max(0, innerWidth - left.length)), 'textBright')} ${theme.style('│', 'border')}`);
  }
  console.log(`  ${theme.style(bottom, 'border')}`);
}

function printAgentTeam(): void {
  const width = terminalWidth();
  const agents: Array<[AgentRole, string]> = [
    ['Planner', 'turns the goal into the next safe action set'],
    ['Scout', 'reads files, scans folders, and searches the repo'],
    ['Research', 'opens web pages and external documentation'],
    ['Builder', 'writes files and runs allowed commands'],
    ['Verifier', 'checks results, errors, and completion state'],
  ];

  const innerWidth = width - 4;
  console.log(`  ${theme.style('╭' + '─'.repeat(width - 2) + '╮', 'border')}`);
  console.log(`  ${theme.style('│', 'border')} ${theme.style('Agent team'.padEnd(innerWidth), 'accent', 'bold')} ${theme.style('│', 'border')}`);
  for (const [agent, detail] of agents) {
    const prefix = `${agent.padEnd(10)} `;
    const content = truncateText(`${prefix}${detail}`, innerWidth);
    console.log(`  ${theme.style('│', 'border')} ${theme.style(prefix, agentColor(agent), 'bold')}${theme.style(content.slice(prefix.length).padEnd(Math.max(0, innerWidth - prefix.length)), 'textDim')} ${theme.style('│', 'border')}`);
  }
  console.log(`  ${theme.style('╰' + '─'.repeat(width - 2) + '╯', 'border')}`);
}

function printRuntimeGuide(goal: string, modelLabel: string, maxIterations: number, display: string): void {
  const width = terminalWidth();
  drawRunPanel([
    ['Goal', goal],
    ['Model', modelLabel],
    ['Agent', `autonomous execution · up to ${maxIterations} guarded steps`],
    ['Display', display],
    ['Safety', 'writes and shell commands follow CodeThon policy gates'],
    ['Controls', 'Ctrl+C cancels · second deliberate Ctrl+C force quits only if stuck · --ask approvals · --dry-run preview'],
  ], width);
  console.log('');
  printAgentTeam();
  console.log('');
  logger.info('Live activity appears below. CodeThon explains each action before it runs.');
  logger.info('Tool JSON stays hidden in normal mode; use --debug only when inspecting internals.');
  logger.divider();
}

function agentColor(agent: AgentRole): 'primary' | 'secondary' | 'success' | 'warning' | 'info' | 'accent' {
  switch (agent) {
    case 'Planner': return 'accent';
    case 'Scout': return 'primary';
    case 'Research': return 'info';
    case 'Builder': return 'secondary';
    case 'Verifier': return 'success';
    case 'Recovery': return 'warning';
    default: return 'primary';
  }
}

function agentForTool(callOrResult: Pick<ToolCall, 'tool' | 'args'> | Pick<ToolResult, 'tool'>): AgentRole {
  const tool = callOrResult.tool;
  if (tool === 'web_search' || tool === 'crawl_url') return 'Research';
  if (tool === 'read_file' || tool === 'list_directory' || tool === 'search_files' || tool === 'grep_search') return 'Scout';
  if (tool === 'write_file') return 'Builder';
  if (tool === 'run_command') {
    const command = 'args' in callOrResult && typeof callOrResult.args?.command === 'string'
      ? callOrResult.args.command.toLowerCase()
      : '';
    return /test|build|typecheck|lint|doctor|check/.test(command) ? 'Verifier' : 'Builder';
  }
  return 'Planner';
}

function eventIcon(state: AgentEventState): string {
  switch (state) {
    case 'queued': return '▣';
    case 'success': return '◆';
    case 'warn': return '▲';
    case 'muted': return '│';
    default: return '●';
  }
}

function eventColor(state: AgentEventState): 'primary' | 'success' | 'warning' | 'error' | 'textDim' | 'accent' {
  switch (state) {
    case 'queued': return 'primary';
    case 'success': return 'success';
    case 'warn': return 'warning';
    case 'muted': return 'textDim';
    default: return 'accent';
  }
}

function printAgentEvent(agent: AgentRole, message: string, state: AgentEventState = 'active'): void {
  const width = terminalWidth(118);
  const name = agent.padEnd(10);
  const textWidth = Math.max(24, width - 18);
  const icon = eventIcon(state);
  console.log(
    `  ${theme.style(icon, eventColor(state), state === 'muted' ? 'dim' : 'bold')} ` +
    `${theme.style(name, agentColor(agent), 'bold')} ` +
    `${theme.style(truncateText(message, textWidth), state === 'muted' ? 'textDim' : 'textBright')}`,
  );
}

function eventElapsed(startMs: number, timestamp: string): string {
  const seconds = Math.max(0, Math.floor((Date.parse(timestamp) - startMs) / 1000));
  return fmtTime(seconds).padStart(5);
}

function runtimeEventColor(type: RuntimeEvent['type']): 'primary' | 'success' | 'warning' | 'error' | 'textDim' | 'accent' {
  if (type.endsWith('FAILED')) return 'error';
  if (type === 'TASK_COMPLETED' || type === 'TOOL_COMPLETED' || type === 'FILE_UPDATED' || type === 'COMMAND_EXECUTED' || type === 'RECEIPT_CREATED') return 'success';
  if (type === 'CHECKPOINT_CREATED' || type === 'STATE_CHANGED' || type === 'MODEL_CALLED') return 'textDim';
  if (type === 'TASK_CANCELLED') return 'warning';
  if (type === 'TOOL_STARTED' || type === 'PLAN_CREATED') return 'accent';
  return 'primary';
}

function printRuntimeEvent(event: RuntimeEvent, startMs: number): void {
  if (event.type === 'STATE_CHANGED') return;
  renderRuntimeEventLine(event, startMs);
}

function toneLabel(tone: DashboardTone): string {
  switch (tone) {
    case 'active': return 'Thinking';
    case 'queued': return 'Queued';
    case 'success': return 'Complete';
    case 'warn': return 'Needs attention';
    case 'muted': return 'Observing';
    default: return 'Idle';
  }
}

function toneColor(tone: DashboardTone): 'primary' | 'secondary' | 'success' | 'warning' | 'textDim' | 'accent' {
  switch (tone) {
    case 'active': return 'accent';
    case 'queued': return 'primary';
    case 'success': return 'success';
    case 'warn': return 'warning';
    case 'muted': return 'textDim';
    default: return 'textDim';
  }
}

function padPlain(text: string, width: number): string {
  const clean = truncateText(stripAnsi(text), width);
  return clean + ' '.repeat(Math.max(0, width - clean.length));
}

function wrapCell(lines: string[], width: number, maxLines: number): string[] {
  const output: string[] = [];
  for (const line of lines) {
    const wrapped = wrapText(line, width).slice(0, Math.max(1, maxLines - output.length));
    output.push(...wrapped);
    if (output.length >= maxLines) break;
  }
  while (output.length < maxLines) output.push('');
  return output.slice(0, maxLines);
}

function previewFromToolCall(call: ToolCall): string[] {
  const filePath = pickStringArg(call.args, ['path', 'file', 'filePath', 'filename', 'target', 'dir', 'directory']);
  const command = pickStringArg(call.args, ['command']);
  const url = pickStringArg(call.args, ['url']);
  const query = pickStringArg(call.args, ['query']);
  const pattern = pickStringArg(call.args, ['pattern', 'include']);

  if (call.tool === 'write_file') {
    const content = typeof call.args.content === 'string' ? call.args.content : '';
    const lines = content.split('\n').slice(0, 7).map(line => `+ ${truncateText(line, 78)}`);
    return [`File: ${formatPath(filePath || 'target file', 82)}`, ...lines];
  }
  if (call.tool === 'read_file') return [`File: ${formatPath(filePath || 'requested file', 82)}`, 'Mode: read current contents'];
  if (call.tool === 'list_directory') return [`Directory: ${formatPath(filePath || '.', 82)}`, 'Mode: project scan'];
  if (call.tool === 'search_files' || call.tool === 'grep_search') return [`Search: ${pattern || 'current task'}`, `Tool: ${HUMAN_TOOL[call.tool] || call.tool}`];
  if (call.tool === 'run_command') return [`Command: ${formatCommand(command || 'requested command', 82)}`, 'Policy: allowlist/blocklist checked before run'];
  if (call.tool === 'web_search') return [`Query: ${query || 'requested topic'}`, 'Mode: web search'];
  if (call.tool === 'crawl_url') return [`URL: ${url || 'requested page'}`, 'Mode: page extraction'];
  return [`Tool: ${call.tool}`];
}

function previewFromToolResult(result: ToolResult): string[] {
  const output = stripAnsi(result.output || '').replace(/\r/g, '').trim();
  if (result.error) {
    return [`Issue: ${truncateText(result.error, 82)}`, output ? `Output: ${truncateText(output.replace(/\s+/g, ' '), 82)}` : 'No output captured'];
  }

  const lines = output.split('\n').map(line => line.trim()).filter(Boolean);
  if (result.tool === 'read_file') {
    return [
      lines[0] ? `File: ${formatPath(lines[0].replace(/\s+\(\d+\s+lines\).*$/, ''), 82)}` : 'File opened',
      ...lines.slice(1, 7).map(line => truncateText(line.replace(/^\d+\|\s*/, ''), 82)),
    ];
  }
  if (result.tool === 'write_file') return [lines[0] || 'File saved'];
  if (result.tool === 'list_directory') return ['Project scan:', ...lines.slice(0, 7).map(line => truncateText(line, 82))];
  if (result.tool === 'run_command') return ['Command output:', ...lines.slice(-7).map(line => truncateText(line, 82))];
  if (result.tool === 'web_search') return ['Search results:', ...lines.filter(line => /^\[\d+\]/.test(line)).slice(0, 5).map(line => truncateText(line, 82))];
  if (result.tool === 'crawl_url') {
    const useful = lines.filter(line => line.startsWith('URL:') || line.startsWith('Title:') || line.startsWith('Description:')).slice(0, 6);
    return useful.length > 0 ? useful : ['Page read completed'];
  }
  return [summarizeToolResultLine(result)];
}

class AutonomousDashboard {
  private statuses = new Map<AgentRole, { tone: DashboardTone; detail: string }>();
  private logs: string[] = [];
  private contextLines: string[] = ['Waiting for the first tool result...'];
  private deliverables: string[] = [];
  private checks: string[] = [];
  private issues: string[] = [];
  private stepLabel = 'Starting';
  private elapsedLabel = '0s';
  private lastRenderAt = 0;
  private spinnerIndex = 0;

  constructor(
    private readonly goal: string,
    private readonly modelLabel: string,
    private readonly maxIterations: number,
    private readonly askMode: boolean,
    private readonly dryRun: boolean,
  ) {
    for (const role of AGENT_ROLES) {
      this.statuses.set(role, { tone: 'idle', detail: 'Idle' });
    }
    this.log('Orchestrator initialized guarded execution');
  }

  log(message: string): void {
    this.logs.push(message);
    if (this.logs.length > 7) this.logs.splice(0, this.logs.length - 7);
  }

  setStatus(role: AgentRole, tone: DashboardTone, detail: string): void {
    this.statuses.set(role, { tone, detail });
  }

  ingestEvidence(evidence?: ExecutionSnapshot): void {
    if (!evidence) return;

    this.deliverables = evidence.artifacts
      .filter(artifact => !artifact.dryRun)
      .slice(-5)
      .map(artifact => {
        const size = artifact.bytes == null ? '' : ` · ${artifact.bytes.toLocaleString()} bytes`;
        return `◆ ${formatPath(artifact.path, 62)}${size}`;
      });

    this.checks = evidence.checks
      .slice(-5)
      .map(check => `${check.success ? '◆' : '▲'} ${check.label}: ${truncateText(check.detail, 62)}`);

    this.issues = evidence.errors
      .slice(-4)
      .map(error => `▲ ${truncateText(error, 72)}`);
  }

  startStep(iteration: number, totalElapsed?: number): void {
    this.stepLabel = `Step ${iteration + 1}/${this.maxIterations}`;
    this.elapsedLabel = fmtTime(totalElapsed || 0);
    this.setStatus('Planner', 'active', 'Drafting next safe action set');
    this.setStatus('Verifier', 'muted', 'Waiting for evidence');
    this.log(`Planner started ${this.stepLabel}`);
  }

  plannerPulse(chars: number): void {
    this.setStatus('Planner', 'active', `Streaming visible action plan (${chars.toLocaleString()} chars)`);
  }

  queue(call: ToolCall): void {
    const role = agentForTool(call);
    this.setStatus(role, 'queued', describeToolCall(call).title);
    this.contextLines = previewFromToolCall(call);
    this.log(`${role} queued ${HUMAN_TOOL[call.tool] || call.tool}`);
  }

  startTool(call: ToolCall): void {
    const role = agentForTool(call);
    this.setStatus(role, 'active', describeToolCall(call).title);
    this.contextLines = previewFromToolCall(call);
    this.log(`${role} started ${HUMAN_TOOL[call.tool] || call.tool}`);
  }

  finishTool(result: ToolResult, evidence?: ExecutionSnapshot): void {
    this.ingestEvidence(evidence);
    const role = agentForTool(result);
    this.setStatus(role, result.error ? 'warn' : 'success', summarizeToolResultLine(result));
    this.contextLines = previewFromToolResult(result);
    this.log(`${role} ${result.error ? 'reported an issue' : 'finished'} ${HUMAN_TOOL[result.tool] || result.tool}`);
  }

  finish(success: boolean, summary: string, elapsed?: number, receipt?: ExecutionReceipt): void {
    if (receipt) this.ingestEvidence(receipt);
    this.elapsedLabel = fmtTime(elapsed || 0);
    if (success) {
      for (const [role, state] of this.statuses.entries()) {
        if (state.tone === 'active' || state.tone === 'queued' || role === 'Verifier') {
          this.setStatus(role, 'success', role === 'Verifier' ? 'Completion receipt confirmed' : 'No pending work');
        }
      }
    }
    this.setStatus('Verifier', success ? 'success' : 'warn', success ? 'Completion receipt confirmed' : 'Execution stopped incomplete');
    if (!success) this.setStatus('Recovery', 'warn', 'Checkpoint and summary captured');
    this.contextLines = this.finalContextLines(success, summary, receipt);
    this.log(success ? 'Verifier issued final receipt' : 'Recovery captured the incomplete state');
  }

  render(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastRenderAt < 350) return;
    this.lastRenderAt = now;
    console.log('');
    console.log(this.frameLines().join('\n'));
  }

  frameLines(): string[] {
    const width = terminalWidth(132);
    if (width < 106) {
      return this.stackedLines(width);
    }

    const totalInner = width - 4;
    const leftW = Math.max(32, Math.floor(totalInner * 0.38));
    const midW = Math.max(32, Math.floor(totalInner * 0.34));
    const rightW = Math.max(24, totalInner - leftW - midW);
    const height = 15;
    const left = this.orchestratorLines(leftW - 2, height);
    const middle = this.statusLines(midW - 2, height);
    const right = this.contextPreviewLines(rightW - 2, height);
    const lines: string[] = [];

    lines.push(`  ${theme.style(`┌${'─'.repeat(leftW)}┬${'─'.repeat(midW)}┬${'─'.repeat(rightW)}┐`, 'border')}`);
    lines.push(`  ${theme.style('│', 'border')}${this.headerCell('ORCHESTRATOR / GLOBAL PROMPT', leftW)}${theme.style('│', 'border')}${this.headerCell('AGENT STATUS MATRIX', midW)}${theme.style('│', 'border')}${this.headerCell('LIVE CONTEXT & DIFFS', rightW)}${theme.style('│', 'border')}`);
    lines.push(`  ${theme.style(`├${'─'.repeat(leftW)}┼${'─'.repeat(midW)}┼${'─'.repeat(rightW)}┤`, 'border')}`);
    for (let i = 0; i < height; i++) {
      lines.push(`  ${theme.style('│', 'border')}${this.bodyCell(left[i], leftW)}${theme.style('│', 'border')}${this.bodyCell(middle[i], midW)}${theme.style('│', 'border')}${this.bodyCell(right[i], rightW)}${theme.style('│', 'border')}`);
    }
    lines.push(`  ${theme.style(`└${'─'.repeat(leftW)}┴${'─'.repeat(midW)}┴${'─'.repeat(rightW)}┘`, 'border')}`);
    return lines;
  }

  private stackedLines(width: number): string[] {
    return [
      ...this.boxLines('ORCHESTRATOR / GLOBAL PROMPT', this.orchestratorLines(width - 4, 10), width),
      '',
      ...this.boxLines('AGENT STATUS MATRIX', this.statusLines(width - 4, 10), width),
      '',
      ...this.boxLines('LIVE CONTEXT & DIFFS', this.contextPreviewLines(width - 4, 10), width),
    ];
  }

  private boxLines(title: string, lines: string[], width: number): string[] {
    const inner = width - 2;
    const output: string[] = [];
    output.push(`  ${theme.style(`┌${'─'.repeat(inner)}┐`, 'border')}`);
    output.push(`  ${theme.style('│', 'border')}${this.headerCell(title, inner)}${theme.style('│', 'border')}`);
    output.push(`  ${theme.style(`├${'─'.repeat(inner)}┤`, 'border')}`);
    for (const line of lines) {
      output.push(`  ${theme.style('│', 'border')}${this.bodyCell(line, inner)}${theme.style('│', 'border')}`);
    }
    output.push(`  ${theme.style(`└${'─'.repeat(inner)}┘`, 'border')}`);
    return output;
  }

  private headerCell(text: string, width: number): string {
    return theme.style(` ${padPlain(text, width - 2)} `, 'accent', 'bold');
  }

  private bodyCell(text: string, width: number): string {
    return ` ${padPlain(text, width - 2)} `;
  }

  private orchestratorLines(width: number, height: number): string[] {
    const promptLines = wrapText(`> ${this.goal}`, width).slice(0, 3);
    const mode = [
      `Model: ${this.modelLabel}`,
      `Mode: ${this.askMode ? 'ask approvals on' : 'ask approvals off'} · ${this.dryRun ? 'dry-run on' : 'dry-run off'}`,
      `Clock: ${this.stepLabel} · elapsed ${this.elapsedLabel}`,
      '',
      'Global Logs:',
      ...this.logs.map(line => `- ${line}`),
    ];
    return wrapCell([...promptLines, '', ...mode], width, height);
  }

  private statusLines(width: number, height: number): string[] {
    const lines: string[] = [];
    const spinner = ['●', '◆', '■', '▲'][this.spinnerIndex++ % 4];
    for (const role of AGENT_ROLES) {
      const state = this.statuses.get(role) || { tone: 'idle' as DashboardTone, detail: 'Idle' };
      const marker = state.tone === 'active' ? spinner : state.tone === 'queued' ? '▣' : state.tone === 'success' ? '◆' : state.tone === 'warn' ? '▲' : ' ';
      lines.push(`[${role.padEnd(8)}] ${marker} ${toneLabel(state.tone)}`);
      lines.push(`  ${state.detail}`);
    }
    return wrapCell(lines, width, height);
  }

  private contextPreviewLines(width: number, height: number): string[] {
    const sections = [...this.contextLines];
    if (this.deliverables.length > 0) {
      sections.push('', 'Deliverables:', ...this.deliverables);
    }
    if (this.checks.length > 0) {
      sections.push('', 'Evidence:', ...this.checks);
    }
    if (this.issues.length > 0) {
      sections.push('', 'Issues:', ...this.issues);
    }
    return wrapCell(sections, width, height);
  }

  private finalContextLines(success: boolean, summary: string, receipt?: ExecutionReceipt): string[] {
    const lines = [success ? 'Execution complete.' : 'Execution incomplete.'];
    if (receipt?.reason) {
      lines.push(`Reason: ${receipt.reason.replace(/_/g, ' ')}`);
    }
    if (receipt?.artifacts?.length) {
      lines.push('Delivered:');
      for (const artifact of receipt.artifacts.filter(item => !item.dryRun).slice(-5)) {
        const size = artifact.bytes == null ? '' : ` · ${artifact.bytes.toLocaleString()} bytes`;
        lines.push(`- ${formatPath(artifact.path, 76)}${size}`);
      }
    }
    lines.push('', truncateText(summary.replace(/\s+/g, ' '), 120));
    return lines;
  }
}

class LiveCockpitRenderer {
  private renderedLines = 0;
  private active = false;
  private lastRenderAt = 0;

  constructor(private readonly dashboard: AutonomousDashboard) {}

  get enabled(): boolean {
    if (process.env.CODETHON_LIVE_COCKPIT === '0') return false;
    if (!process.stdout.isTTY) return false;
    if ((process.stdout.columns || 0) < 96) return false;
    if ((process.env.TERM || '').toLowerCase() === 'dumb') return false;
    return true;
  }

  start(): void {
    if (!this.enabled || this.active) return;
    this.active = true;
    process.stdout.write('\x1b[?25l');
  }

  render(force = false): boolean {
    if (!this.enabled) return false;

    const now = Date.now();
    if (!force && now - this.lastRenderAt < 120) return true;
    this.lastRenderAt = now;
    this.start();

    const lines = this.dashboard.frameLines();
    if (this.renderedLines > 0) {
      process.stdout.write(`\x1b[${this.renderedLines}F\x1b[J`);
    } else {
      process.stdout.write('\n');
    }

    process.stdout.write(`${lines.join('\n')}\n`);
    this.renderedLines = lines.length;
    return true;
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.renderedLines = 0;
    process.stdout.write('\x1b[?25h');
  }
}

function describeToolCall(call: ToolCall): { title: string; detail: string } {
  const { tool, args } = call;
  const filePath = pickStringArg(args, ['path', 'file', 'filePath', 'filename', 'target', 'dir', 'directory']);
  const pattern = pickStringArg(args, ['pattern', 'include']);
  const query = pickStringArg(args, ['query']);
  const command = pickStringArg(args, ['command']);
  const url = pickStringArg(args, ['url']);

  switch (tool) {
    case 'read_file':
      return {
        title: filePath ? `Reading ${formatPath(filePath)}` : 'Reading a file path requested by the model',
        detail: filePath
          ? `Reading ${formatPath(filePath)} so the agent can understand the current implementation before making changes.`
          : 'The model asked to read a file but did not provide a concrete path. CodeThon will return a clear tool error instead of crashing.',
      };
    case 'write_file':
      return {
        title: filePath ? `Updating ${formatPath(filePath)}` : 'Updating a file',
        detail: `Applying the next code change in ${filePath ? formatPath(filePath) : 'the target file'}.`,
      };
    case 'list_directory':
      return {
        title: `Scanning ${formatPath(filePath || '.')}`,
        detail: `Scanning ${filePath ? formatPath(filePath) : 'the project root'} to understand folders, entry points, and project structure.`,
      };
    case 'search_files':
      return {
        title: `Finding files for ${pattern || 'the current task'}`,
        detail: `Looking for files that match ${pattern || 'the requested pattern'} to narrow down where changes are needed.`,
      };
    case 'grep_search':
      return {
        title: `Searching code for ${pattern || 'the requested text'}`,
        detail: `Looking through the codebase for ${pattern || 'matching content'} to find the right place to inspect or edit.`,
      };
    case 'run_command':
      return {
        title: `Running ${formatCommand(command || 'a command', 48)}`,
        detail: `Executing ${formatCommand(command || 'the requested command')} to validate the project or inspect its current state.`,
      };
    case 'web_search':
      return {
        title: 'Searching the web',
        detail: `Looking up ${query || 'the requested topic'} for documentation or examples.`,
      };
    case 'crawl_url':
      return {
        title: 'Reading a web page',
        detail: `Opening ${url || 'the requested page'} to pull the relevant documentation into the task.`,
      };
    default:
      return {
        title: `Running ${HUMAN_TOOL[tool] || tool}`,
        detail: `Working on the next ${HUMAN_TOOL[tool] || tool} step.`,
      };
  }
}

function summarizeLines(lines: string[], width: number, maxLines: number): string {
  const visible = lines
    .map(line => truncateText(line.trim(), width))
    .filter(Boolean)
    .slice(0, maxLines);
  return visible.join('\n');
}

function summarizeToolOutput(toolResult: ToolResult, width: number): string {
  if (toolResult.error) {
    return truncateText(stripAnsi(toolResult.error), width * 3);
  }

  const output = stripAnsi(toolResult.output || '').replace(/\r/g, '').trim();
  if (!output) {
    return 'The step finished without terminal output.';
  }

  const lines = output.split('\n').map(line => line.trim()).filter(Boolean);

  switch (toolResult.tool) {
    case 'read_file':
      return truncateText(`Opened ${lines[0] || 'the requested file'}.`, width * 2);
    case 'write_file':
      return truncateText(lines[0] || 'Saved the requested file.', width * 2);
    case 'list_directory': {
      const items = lines.slice(1, 7);
      return items.length > 0
        ? `Top entries:\n${items.map(item => `- ${truncateText(item, Math.max(12, width - 2))}`).join('\n')}`
        : 'Scanned the requested folder.';
    }
    case 'search_files': {
      const items = lines.slice(1, 7);
      return items.length > 0
        ? `Matching files:\n${items.map(item => `- ${truncateText(item, Math.max(12, width - 2))}`).join('\n')}`
        : (lines[0] || 'No matching files found.');
    }
    case 'grep_search': {
      const items = lines.slice(1, 6);
      return items.length > 0
        ? `Matches:\n${items.map(item => `- ${truncateText(item, Math.max(12, width - 2))}`).join('\n')}`
        : (lines[0] || 'No matching lines found.');
    }
    case 'run_command':
      return summarizeLines(lines.slice(-8), width, 8) || 'The command finished without output.';
    case 'web_search': {
      const items = lines.filter(line => /^\[\d+\]/.test(line)).slice(0, 4);
      return items.length > 0
        ? `Search results:\n${items.map(item => `- ${truncateText(item.replace(/^\[\d+\]\s*/, ''), Math.max(12, width - 2))}`).join('\n')}`
        : summarizeLines(lines, width, 6);
    }
    case 'crawl_url': {
      const titleLine = lines.find(line => line.startsWith('Title:'));
      const descriptionLine = lines.find(line => line.startsWith('Description:'));
      return [titleLine, descriptionLine]
        .filter(Boolean)
        .map(line => truncateText(line!, width))
        .join('\n') || summarizeLines(lines, width, 6);
    }
    default:
      return summarizeLines(lines, width, 8);
  }
}

function summarizeToolResultLine(toolResult: ToolResult): string {
  if (toolResult.error) {
    return truncateText(stripAnsi(toolResult.error).replace(/\s+/g, ' ').trim(), 96);
  }

  const output = stripAnsi(toolResult.output || '').replace(/\r/g, '').trim();
  const lines = output.split('\n').map(line => line.trim()).filter(Boolean);

  switch (toolResult.tool) {
    case 'read_file':
      return lines[0] ? `opened ${formatPath(lines[0].replace(/\s+\(\d+\s+lines\).*$/, ''), 72)}` : 'opened file';
    case 'write_file':
      return lines[0] ? truncateText(lines[0], 96) : 'saved file';
    case 'list_directory':
      return `scanned ${Math.max(0, lines.length)} entries`;
    case 'search_files':
    case 'grep_search':
      return lines[0] ? truncateText(lines[0], 96) : 'search completed';
    case 'run_command':
      return 'command completed';
    case 'web_search':
      return 'search completed';
    case 'crawl_url':
      return 'page read completed';
    default:
      return 'done';
  }
}

function parseToolCallsFromBuffer(raw: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const lines = stripAnsi(raw).replace(/\r/g, '').split('\n').filter(line => line.includes('TOOL_CALL:'));

  for (const line of lines) {
    const jsonStart = line.indexOf('{');
    if (jsonStart < 0) continue;

    const jsonText = line.slice(jsonStart);
    try {
      const parsed = JSON.parse(jsonText) as { id?: string; tool?: string; args?: Record<string, unknown> };
      if (parsed.id && parsed.tool) {
        calls.push({ id: parsed.id, tool: parsed.tool, args: parsed.args || {} });
      }
    } catch {
      const toolMatch = jsonText.match(/"tool"\s*:\s*"([^"]+)/);
      if (toolMatch) {
        calls.push({ id: `${calls.length + 1}`, tool: toolMatch[1], args: {} });
      }
    }
  }

  return calls;
}

function parseCompleteToolCallsFromBuffer(raw: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const lines = stripAnsi(raw).replace(/\r/g, '').split('\n').filter(line => line.includes('TOOL_CALL:') && line.includes('}'));

  for (const line of lines) {
    const jsonStart = line.indexOf('{');
    if (jsonStart < 0) continue;
    try {
      const parsed = JSON.parse(line.slice(jsonStart)) as { id?: string; tool?: string; args?: Record<string, unknown> };
      if (parsed.id && parsed.tool) {
        calls.push({ id: parsed.id, tool: parsed.tool, args: parsed.args || {} });
      }
    } catch {
      // Ignore partial or malformed streamed JSON. The executor will handle the final parsed content.
    }
  }

  return calls;
}

function summarizeAssistantBuffer(raw: string, width: number): { title: string; text: string } {
  const cleaned = stripAnsi(raw).replace(/\r/g, '').trim();
  if (!cleaned) {
    return {
      title: 'What CodeThon Is Doing',
      text: 'Reviewing the project and deciding the next safe step.',
    };
  }

  const doneMatch = cleaned.match(/DONE:\s*([\s\S]*)$/i);
  if (doneMatch?.[1]?.trim()) {
    return {
      title: 'Summary',
      text: doneMatch[1].trim(),
    };
  }

  if (cleaned.includes('TOOL_CALL:')) {
    const calls = parseToolCallsFromBuffer(cleaned);
    if (calls.length > 0) {
      return {
        title: 'Planned Actions',
        text: calls
          .slice(0, 6)
          .map((call, index) => `${index + 1}. ${truncateText(describeToolCall(call).title, Math.max(12, width - 3))}`)
          .join('\n'),
      };
    }

    const toolNameMatch = cleaned.match(/"tool"\s*:\s*"([^"]+)/);
    return {
      title: 'Planned Actions',
      text: toolNameMatch
        ? `Preparing to run ${toolNameMatch[1].replace(/_/g, ' ')}.`
        : 'Choosing the next action set.',
    };
  }

  return {
    title: 'Assistant',
    text: cleaned,
  };
}

function formatReceiptForPreview(receipt: ExecutionReceipt | undefined, fallback: string): string {
  if (!receipt) return fallback;

  const artifacts = receipt.artifacts
    .filter(artifact => !artifact.dryRun)
    .map(artifact => {
      const size = artifact.bytes == null ? '' : ` · ${artifact.bytes.toLocaleString()} bytes`;
      return `- ${formatPath(artifact.path, 72)}${size}`;
    });
  const checks = receipt.checks
    .filter(check => check.success)
    .slice(-5)
    .map(check => `- ${check.label}: ${truncateText(check.detail, 96)}`);

  return [
    receipt.summary,
    artifacts.length > 0 ? '\nDelivered:\n' + artifacts.join('\n') : '',
    checks.length > 0 ? '\nEvidence:\n' + checks.join('\n') : '',
  ].filter(Boolean).join('\n');
}

function printFinalReceipt(result: { success: boolean; summary: string; receipt?: ExecutionReceipt }, journalPath: string): void {
  console.log('');
  logger.subsection(result.success ? 'Completion Receipt' : 'Incomplete Run');

  const receipt = result.receipt;
  if (receipt?.reason) logger.labelValue('Reason', receipt.reason.replace(/_/g, ' '));
  logger.labelValue('Journal', journalPath);

  const artifacts = receipt?.artifacts?.filter(artifact => !artifact.dryRun) || [];
  if (artifacts.length > 0) {
    logger.labelValue('Delivered', artifacts.map(artifact => {
      const size = artifact.bytes == null ? '' : ` (${artifact.bytes.toLocaleString()} bytes)`;
      return `${formatPath(artifact.path, 52)}${size}`;
    }).join(', '));
  }

  const checks = receipt?.checks?.filter(check => check.success).slice(-5) || [];
  if (checks.length > 0) {
    logger.labelValue('Evidence', checks.map(check => `${check.label}: ${truncateText(check.detail, 42)}`).join(' | '));
  }

  if (result.summary) {
    console.log('');
    renderAgentOutput(result.summary);
  }
}

function shouldUseFullscreenRenderer(): boolean {
  if (process.env.CODETHON_FULLSCREEN === '1') return true;
  return false;
}

function shouldUseV4Workspace(tuiPreference = true): boolean {
  if (!tuiPreference) return false;
  if (process.env.CODETHON_TUI === '0') return false;
  if (process.env.CODETHON_FULLSCREEN === '1') return false;
  if (process.env.CI === 'true') return false;
  if (!process.stdout.isTTY || !process.stdin.isTTY) return false;
  if ((process.env.TERM || '').toLowerCase() === 'dumb') return false;
  return (process.stdout.columns || 0) >= 88 && (process.stdout.rows || 0) >= 24;
}

async function executeLineMode(
  goal: string,
  askMode: boolean,
  dryRun: boolean,
  modelLabel: string,
  contextSnapshot: ExecutionContextSnapshot,
  promptContext: string,
): Promise<CommandResult> {
  const maxIterations = 40;
  const loop = new JobLoop(process.cwd(), maxIterations, askMode, dryRun);
  loop.setExecutionContext(promptContext);
  const runtime = new AgentRuntime({ cwd: process.cwd(), command: 'execute', goal });
  const startMs = Date.now();
  let interruptCount = 0;
  let lastInterruptAt = 0;
  let cancellationRequested = false;
  let plannerBuffer = '';
  let lastPlannerPulse = 0;

  const cleanupSignalHandlers = () => {
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
  };

  const handleSignal = () => {
    const now = Date.now();
    if (now - lastInterruptAt < INTERRUPT_DEBOUNCE_MS) return;
    lastInterruptAt = now;

    if (!cancellationRequested) {
      cancellationRequested = true;
      interruptCount = 1;
      loop.cancel('Execution interrupted by user.');
      runtime.cancel('Execution interrupted by user.');
      process.stderr.write('\nExecution interrupted. Waiting for the current step to stop. Press Ctrl+C again if it is stuck.\n');
      return;
    }

    interruptCount++;
    if (interruptCount > 1) {
      runtime.cancel('Execution interrupted by user. Force quit requested.');
      cleanupSignalHandlers();
      process.stderr.write('\nExecution interrupted. Force quitting.\n');
      process.exit(130);
    }
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  renderExecuteStart({
    goal,
    model: modelLabel,
    sessionId: runtime.meta.runId,
    journalPath: runtime.journalPathForDisplay(),
    askMode,
    dryRun,
  });

  const unsubscribe = runtime.bus.subscribe(event => printRuntimeEvent(event, startMs));
  runtime.start();
  runtime.contextBuilt(contextSnapshot);

  try {
    const result = await loop.execute(
      goal,
      (status: JobStatus) => {
        runtime.handleStatus(status);
        if (status.phase === 'plan' && !status.done) {
          plannerBuffer = '';
          lastPlannerPulse = 0;
        }
      },
      (token: string) => {
        plannerBuffer += token;
        if (plannerBuffer.length > MAX_PREVIEW_CHARS) {
          plannerBuffer = plannerBuffer.slice(-MAX_PREVIEW_CHARS);
        }

        const now = Date.now();
        if (now - lastPlannerPulse > 4000) {
          const chars = stripAnsi(plannerBuffer).length;
          runtime.modelActivity(chars);
          lastPlannerPulse = now;
        }
      },
    );

    runtime.complete(result);
    logger.divider();
    notifyExecutionResult(result);
    printFinalReceipt(result, runtime.journalPathForDisplay());
    console.log('');

    return {
      success: result.success,
      message: result.summary,
      data: result as unknown as Record<string, unknown>,
    };
  } finally {
    unsubscribe();
    cleanupSignalHandlers();
  }
}

async function executeV4WorkspaceMode(
  goal: string,
  askMode: boolean,
  dryRun: boolean,
  modelLabel: string,
  providerLabel: string,
  contextSnapshot: ExecutionContextSnapshot,
  promptContext: string,
): Promise<CommandResult> {
  const maxIterations = 40;
  const loop = new JobLoop(process.cwd(), maxIterations, askMode, dryRun);
  loop.setExecutionContext(promptContext);
  const runtime = new AgentRuntime({ cwd: process.cwd(), command: 'execute', goal });
  const workspace = new V4WorkspaceRenderer({
    sessionId: runtime.meta.runId,
    goal,
    command: 'execute',
    cwd: process.cwd(),
    model: modelLabel,
    provider: providerLabel,
    askMode,
    dryRun,
    journalPath: runtime.journalPathForDisplay(),
  });

  let interruptCount = 0;
  let lastInterruptAt = 0;
  let cancellationRequested = false;
  let plannerBuffer = '';
  let lastPlannerPulse = 0;

  const cleanupSignalHandlers = () => {
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
  };

  const cancelExecution = (force: boolean) => {
    const now = Date.now();
    if (now - lastInterruptAt < INTERRUPT_DEBOUNCE_MS) return;
    lastInterruptAt = now;

    if (!cancellationRequested) {
      cancellationRequested = true;
      interruptCount = 1;
      loop.cancel('Execution interrupted by user.');
      runtime.cancel('Execution interrupted by user.');
      return;
    }

    interruptCount++;
    if (force || interruptCount > 1) {
      loop.cancel('Execution interrupted by user. Force quit requested.');
      runtime.cancel('Execution interrupted by user. Force quit requested.');
      workspace.stop();
      cleanupSignalHandlers();
      process.stderr.write('\nExecution interrupted. Force quitting.\n');
      process.exit(130);
    }
  };

  const handleSignal = () => {
    cancelExecution(false);
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  const started = workspace.start(cancelExecution);
  if (!started) {
    cleanupSignalHandlers();
    return executeLineMode(goal, askMode, dryRun, modelLabel, contextSnapshot, promptContext);
  }

  const unsubscribe = runtime.bus.subscribe(event => workspace.applyEvent(event));
  runtime.start();
  runtime.contextBuilt(contextSnapshot);

  try {
    const result = await loop.execute(
      goal,
      (status: JobStatus) => {
        runtime.handleStatus(status);
        if (status.phase === 'plan' && !status.done) {
          plannerBuffer = '';
          lastPlannerPulse = 0;
        }
      },
      (token: string) => {
        workspace.appendToken(token);
        plannerBuffer += token;
        if (plannerBuffer.length > MAX_PREVIEW_CHARS) {
          plannerBuffer = plannerBuffer.slice(-MAX_PREVIEW_CHARS);
        }

        const now = Date.now();
        if (now - lastPlannerPulse > 3500) {
          runtime.modelActivity(stripAnsi(plannerBuffer).length);
          lastPlannerPulse = now;
        }
      },
    );

    runtime.complete(result);
    workspace.finish(result);
    await new Promise(resolve => setTimeout(resolve, 900));
    workspace.stop();
    workspace.printFinalSnapshot(result);

    return {
      success: result.success,
      message: result.summary,
      data: result as unknown as Record<string, unknown>,
    };
  } finally {
    unsubscribe();
    cleanupSignalHandlers();
    workspace.stop();
  }
}

export async function executeCommand(goal: string, askMode = false, dryRun = false, tuiPreference = true): Promise<CommandResult> {
  if (!goal) {
    process.stderr.write(`${theme.style('Error: No goal specified.', 'error')} Usage: /execute <goal> inside ct, or ct execute <goal> from your shell\n`);
    return { success: false, message: 'No goal specified' };
  }

  const config = getLLMConfig();
  const modelLabel = config.model?.split('/').pop() || config.model || 'unknown';
  const providerLabel = config.provider || 'unknown';
  const contextSnapshot = await buildExecutionContextSnapshot(goal, process.cwd());
  const promptContext = formatExecutionContextForPrompt(contextSnapshot);

  if (shouldUseV4Workspace(tuiPreference)) {
    return executeV4WorkspaceMode(goal, askMode, dryRun, modelLabel, providerLabel, contextSnapshot, promptContext);
  }

  if (!shouldUseFullscreenRenderer()) {
    return executeLineMode(goal, askMode, dryRun, modelLabel, contextSnapshot, promptContext);
  }

  const maxIterations = 40;
  const loop = new JobLoop(process.cwd(), maxIterations, askMode, dryRun);
  loop.setExecutionContext(promptContext);
  const renderer = new TerminalRenderer();
  const view = {
    currentTask: 'Getting ready',
    currentStage: 'Starting',
    progress: 0,
    elapsed: '0s',
    activity: ['Waiting for the first step...'],
    previewMode: 'assistant' as PreviewMode,
    previewTitle: 'What CodeThon Is Doing',
    previewText: 'Reviewing the project and choosing a safe first step.',
    assistantBuffer: '',
    statusLine: 'Preparing the execution loop',
    errors: [] as string[],
  };

  let streamBuffer = '';
  let lastRenderAt = 0;
  let renderTimer: ReturnType<typeof setTimeout> | null = null;
  let result: Awaited<ReturnType<JobLoop['execute']>> | null = null;
  let screenClosed = false;
  let signalHandlerInstalled = false;
  let interruptCount = 0;
  let lastInterruptAt = 0;
  let cancellationRequested = false;

  const cleanupScreen = () => {
    if (screenClosed) return;
    screenClosed = true;
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
    renderer.dispose({ restoreScreen: true });
  };

  const cleanupSignalHandlers = () => {
    if (!signalHandlerInstalled) return;
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
    signalHandlerInstalled = false;
  };

  const renderFrame = () => {
    if (screenClosed) return;

    const dimensions = renderer.dimensions;
    const boxWidth = Math.max(64, Math.min(dimensions.width - 2, 100));
    const boxX = Math.max(0, Math.min(1, dimensions.width - boxWidth));
    const headerY = 0;
    const headerH = 6;
    const stepY = headerY + headerH;
    const stepH = 5;
    const activityY = stepY + stepH;
    const activityH = 8;
    const previewY = activityY + activityH;
    const previewH = Math.max(6, dimensions.height - previewY - 1);
    const innerWidth = boxWidth - 4;
    const preview = view.previewMode === 'assistant'
      ? summarizeAssistantBuffer(view.assistantBuffer, innerWidth)
      : { title: view.previewTitle, text: view.previewText || 'Waiting for output...' };

    renderer.clear();

    renderer.drawBox(boxX, headerY, { width: boxWidth, height: headerH, title: ' Execute ', color: 'primary', borderStyle: 'double' });
    renderer.writeText(boxX + 2, headerY + 1, truncateText(`Goal: ${goal}`, innerWidth), { fg: theme.colors.textBright, bold: true });
    renderer.writeText(boxX + 2, headerY + 2, truncateText(`AI model: ${modelLabel}`, innerWidth), { fg: theme.colors.textDim });
    renderer.writeText(boxX + 2, headerY + 3, truncateText(`${view.currentStage} | elapsed ${view.elapsed}`, innerWidth), { fg: theme.colors.text });
    renderer.writeText(boxX + 2, headerY + 4, truncateText('Controls: Ctrl+C cancels · second deliberate Ctrl+C force quits only if stuck · ask/dry-run flags respected', innerWidth), { fg: theme.colors.textDim });

    renderer.drawBox(boxX, stepY, { width: boxWidth, height: stepH, title: ' Current Step ', color: 'warning', borderStyle: 'rounded' });
    renderer.writeText(boxX + 2, stepY + 1, truncateText(view.currentTask, innerWidth), { fg: theme.colors.textBright, bold: true });
    renderer.writeText(boxX + 2, stepY + 2, truncateText(view.statusLine, innerWidth), { fg: theme.colors.textDim });
    renderer.writeText(boxX + 2, stepY + 3, progressBar(view.progress, Math.max(12, innerWidth - 8)), { fg: theme.colors.primary });

    renderer.drawBox(boxX, activityY, { width: boxWidth, height: activityH, title: ' Recent Actions ', color: 'info', borderStyle: 'rounded' });
    const activityLines = view.activity.slice(-Math.max(1, activityH - 2));
    for (let i = 0; i < activityLines.length && i < activityH - 2; i++) {
      renderer.writeText(boxX + 2, activityY + 1 + i, truncateText(activityLines[i], innerWidth), { fg: theme.colors.text });
    }

    renderer.drawBox(boxX, previewY, { width: boxWidth, height: previewH, title: ` ${preview.title} `, color: view.errors.length > 0 ? 'error' : 'secondary', borderStyle: 'rounded' });
    const previewLines = wrapText(preview.text || 'Waiting for output...', innerWidth).slice(-(previewH - 2));
    for (let i = 0; i < previewLines.length && i < previewH - 2; i++) {
      renderer.writeText(boxX + 2, previewY + 1 + i, truncateText(previewLines[i], innerWidth), { fg: theme.colors.textDim });
    }

    renderer.flush();
  };

  const scheduleRender = (force = false) => {
    if (screenClosed) return;
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }

    const now = Date.now();
    if (force || now - lastRenderAt > 33) {
      renderFrame();
      lastRenderAt = now;
      return;
    }

    renderTimer = setTimeout(() => {
      renderTimer = null;
      if (screenClosed) return;
      renderFrame();
      lastRenderAt = Date.now();
    }, 33);
  };

  const handleSignal = () => {
    const now = Date.now();
    if (now - lastInterruptAt < INTERRUPT_DEBOUNCE_MS) return;
    lastInterruptAt = now;

    if (!cancellationRequested) {
      cancellationRequested = true;
      interruptCount = 1;
      loop.cancel('Execution interrupted by user.');
      cleanupScreen();
      process.stderr.write('\nExecution interrupted. Waiting for the current step to stop. Press Ctrl+C again if it is stuck.\n');
      return;
    }

    interruptCount++;
    if (interruptCount > 1) {
      loop.cancel('Execution interrupted by user. Force quit requested.');
      cleanupScreen();
      cleanupSignalHandlers();
      process.stderr.write('\nExecution interrupted. Force quitting.\n');
      process.exit(130);
    }
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);
  signalHandlerInstalled = true;

  renderer.enterAlternateScreen();
  renderer.hideCursor();
  renderer.clearScreen();
  scheduleRender(true);

  try {
    result = await loop.execute(
      goal,
      (status: JobStatus) => {
        if (status.phase === 'plan' && !status.done) {
          streamBuffer = '';
          view.previewMode = 'assistant';
          view.previewTitle = 'What CodeThon Is Doing';
          view.previewText = 'Reviewing the project and choosing the next safe step.';
          view.assistantBuffer = '';
          view.currentTask = `Step ${status.iteration + 1} of ${maxIterations}`;
          view.currentStage = 'Thinking';
          view.statusLine = 'Reviewing the project and deciding what to do next';
          view.progress = status.iteration / maxIterations;
          view.elapsed = fmtTime(status.totalElapsed);
          pushActivity(view.activity, `Thinking through step ${status.iteration + 1}`);
        } else if (status.phase === 'tool_call' && status.toolCall) {
          const description = describeToolCall(status.toolCall);
          view.previewMode = 'message';
          view.previewTitle = 'Current Action';
          view.previewText = description.detail;
          view.currentStage = 'Working';
          view.currentTask = description.title;
          view.statusLine = 'Running the next action';
          pushActivity(view.activity, description.title);
        } else if (status.phase === 'tool_result' && status.toolResult) {
          const label = HUMAN_TOOL[status.toolResult.tool] || status.toolResult.tool;
          view.previewMode = 'message';
          view.previewTitle = status.toolResult.error ? 'Issue Found' : 'Latest Result';
          view.previewText = summarizeToolOutput(status.toolResult, Math.max(20, renderer.dimensions.width - 8));
          view.currentStage = status.toolResult.error ? 'Needs attention' : 'Completed';
          view.currentTask = status.toolResult.error ? `${label} needs attention` : `${label} finished`;
          view.statusLine = status.toolResult.error ? 'The last step returned an error' : 'The last step finished successfully';
          if (status.toolResult.error) {
            view.errors.push(status.toolResult.error);
            pushActivity(view.activity, `${label}: issue found`);
          } else {
            pushActivity(view.activity, `${label}: done`);
          }
        } else if (status.phase === 'done') {
          view.previewMode = 'message';
          view.previewTitle = status.error ? 'Execution Status' : 'Summary';
          view.previewText = formatReceiptForPreview(status.receipt, status.description || (status.error ? 'Execution stopped.' : 'Goal completed.'));
          view.currentStage = status.error ? 'Stopped' : 'Finished';
          view.currentTask = status.error ? 'Execution stopped' : 'Goal completed';
          view.statusLine = status.description || 'Done';
          view.progress = 1;
          view.elapsed = fmtTime(status.totalElapsed);
          if (status.error) {
            view.errors.push(status.error);
            pushActivity(view.activity, 'Execution stopped');
          } else {
            pushActivity(view.activity, 'Goal completed');
          }
        }

        scheduleRender();
      },
      (token: string) => {
        streamBuffer += token;
        if (streamBuffer.length > MAX_PREVIEW_CHARS) {
          streamBuffer = streamBuffer.slice(-MAX_PREVIEW_CHARS);
        }
        view.previewMode = 'assistant';
        view.assistantBuffer = streamBuffer;
        scheduleRender();
      },
    );

    scheduleRender(true);
  } finally {
    cleanupSignalHandlers();
    cleanupScreen();
  }

  if (!result) {
    return { success: false, message: 'Execution failed before result was produced' };
  }

  logger.section('CodeThon CLI — Execute');
  notifyExecutionResult(result);
  logger.labelValue('Goal', goal);
  logger.labelValue('Model', modelLabel);
  logger.labelValue('Iterations', String(result.iterations));
  logger.labelValue('Elapsed', fmtTime(result.elapsed));
  logger.labelValue('Status', result.success ? 'goal met' : 'incomplete');
  if (result.summary) {
    console.log('');
    renderAgentOutput(result.summary);
  }
  console.log('');

  return {
    success: result.success,
    message: result.summary,
    data: result as unknown as Record<string, unknown>,
  };
}
