import readline from 'readline';
import type { JobResult } from '../cil/job-loop';
import type { RuntimeEvent } from '../events/types';
import { TerminalRenderer } from '../ui/terminal-renderer';
import { theme, type RGB } from '../ui/theme';
import { stripAnsi, truncateText, wrapText } from '../ui/terminal-text';
import {
  appendV4ModelToken,
  createInitialV4RuntimeState,
  reduceV4RuntimeEvent,
  setV4Drawer,
  type V4AgentRow,
  type V4Drawer,
  type V4RuntimeOptions,
  type V4RuntimeViewState,
} from './v4-state';

export interface V4WorkspaceOptions extends V4RuntimeOptions {
  askMode: boolean;
  dryRun: boolean;
  journalPath: string;
}

interface Key {
  name?: string;
  sequence?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
}

const SHORTCUTS = [
  'Ctrl+K Palette',
  'Ctrl+M Mission',
  'Ctrl+T Trace',
  'Ctrl+I Context',
  'Ctrl+D Diff',
  'Ctrl+A Agents',
  'Esc Close',
];

export class V4WorkspaceRenderer {
  private readonly renderer = new TerminalRenderer();
  private state: V4RuntimeViewState;
  private active = false;
  private lastRenderAt = 0;
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private previousRawMode = false;
  private keyHandler?: (chunk: string, key: Key) => void;
  private cancelCount = 0;

  constructor(private readonly options: V4WorkspaceOptions) {
    this.state = createInitialV4RuntimeState(options);
  }

  get enabled(): boolean {
    if (process.env.CODETHON_TUI === '0') return false;
    if (process.env.CI === 'true') return false;
    if (!process.stdout.isTTY || !process.stdin.isTTY) return false;
    if ((process.env.TERM || '').toLowerCase() === 'dumb') return false;
    const columns = process.stdout.columns || 0;
    const rows = process.stdout.rows || 0;
    return columns >= 88 && rows >= 24;
  }

  start(onCancel: (force: boolean) => void): boolean {
    if (!this.enabled || this.active) return false;
    this.active = true;
    this.previousRawMode = Boolean((process.stdin as any).isRaw);
    readline.emitKeypressEvents(process.stdin);
    try {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    } catch {
      // Some terminals disallow raw mode. Rendering can continue without drawers.
    }

    this.keyHandler = (chunk: string, key: Key) => {
      const normalizedKey = { ...key, sequence: chunk };
      if (key.ctrl && key.name === 'c') {
        this.cancelCount++;
        onCancel(this.cancelCount > 1);
        this.applyLocalNotice(this.cancelCount > 1 ? 'Force quit requested.' : 'Cancellation requested. Waiting for current step to stop.');
        return;
      }

      const drawer = drawerForKey(normalizedKey);
      if (drawer !== undefined) {
        if (drawer === null && this.state.activeDrawer === null && isRunningState(this.state.state)) {
          this.cancelCount++;
          onCancel(false);
          this.applyLocalNotice('Escape pressed. Cancelling the active run and returning to the REPL.');
          return;
        }

        this.state = setV4Drawer(this.state, drawer);
        this.render(true);
      }
    };

    process.stdin.on('keypress', this.keyHandler);
    this.renderer.enterAlternateScreen();
    this.renderer.hideCursor();
    this.renderer.clearScreen();
    this.render(true);
    return true;
  }

  stop(): void {
    if (this.renderTimer) {
      clearTimeout(this.renderTimer);
      this.renderTimer = null;
    }
    if (this.keyHandler) {
      process.stdin.off('keypress', this.keyHandler);
      this.keyHandler = undefined;
    }
    try {
      process.stdin.setRawMode(this.previousRawMode);
    } catch {
      // Ignore raw-mode restore issues.
    }
    this.renderer.dispose({ restoreScreen: true });
    this.active = false;
  }

  applyEvent(event: RuntimeEvent): void {
    this.state = reduceV4RuntimeEvent(this.state, event);
    this.scheduleRender();
  }

  appendToken(token: string): void {
    this.state = appendV4ModelToken(this.state, token);
    this.scheduleRender();
  }

  finish(result: JobResult): void {
    this.state = {
      ...this.state,
      completionSummary: result.summary,
      receipt: result.receipt,
      progress: result.success ? 100 : this.state.progress,
    };
    this.render(true);
  }

  printFinalSnapshot(result: JobResult): void {
    const width = Math.max(88, Math.min(126, process.stdout.columns || 110));
    const inner = width - 4;
    const state = this.state.state === 'CANCELLED' ? 'CANCELLED' : result.success ? 'COMPLETED' : 'FAILED';
    const stateColor = state === 'COMPLETED' ? 'success' : state === 'CANCELLED' ? 'warning' : 'error';
    const status = theme.style(state, stateColor, 'bold');
    const title = `${theme.style('CodeThon OLED', 'accent', 'bold')} ${theme.style('│', 'border')} ${theme.style(this.state.projectName, 'textBright')} ${theme.style('│', 'border')} ${theme.style(this.state.provider, 'info')} ${theme.style('│', 'border')} ${theme.style(this.state.model, 'textBright')} ${theme.style('│', 'border')} ${status}`;
    const receipt = result.receipt;
    const artifacts = receipt?.artifacts || [];
    const checks = receipt?.checks || [];
    const lines = [
      `Goal: ${this.state.goal}`,
      `Result: ${state === 'COMPLETED' ? 'Execution complete' : state === 'CANCELLED' ? 'Execution cancelled' : 'Execution halted'} · ${result.iterations} steps · ${formatElapsed(result.elapsed)}`,
      `Reason: ${state === 'CANCELLED' ? 'user interrupted' : receipt?.reason?.replace(/_/g, ' ') || (result.success ? 'completed' : 'failed')}`,
      `Journal: ${this.options.journalPath}`,
      '',
      'Completion Receipt',
      ...(artifacts.length > 0
        ? artifacts.slice(0, 8).map(item => `◆ ${item.path}${item.bytes != null ? ` · ${item.bytes.toLocaleString()} bytes` : ''}`)
        : ['No file artifacts recorded.']),
      '',
      'Verification',
      ...(checks.length > 0
        ? checks.slice(0, 8).map(item => `${item.success ? '◆' : '▲'} ${item.label}: ${item.detail}`)
        : ['No verification checks recorded.']),
      '',
      truncateText(result.summary || 'No summary returned.', inner),
      '',
      'Next: type /inspect to review the journal, /replay to replay the run, /diff to inspect changes, or /execute <goal> to continue.',
      'Back in the REPL: type / to open the command palette.',
    ];

    console.log('');
    console.log(`  ${theme.style(`╭${'─'.repeat(width - 2)}╮`, 'border')}`);
    console.log(`  ${theme.style('│', 'border')} ${padLine(title, inner)} ${theme.style('│', 'border')}`);
    console.log(`  ${theme.style('├', 'border')}${theme.style('─'.repeat(width - 2), 'border')}${theme.style('┤', 'border')}`);
    for (const line of lines) {
      const color = finalLineColor(line);
      for (const wrapped of wrapText(line, inner)) {
        console.log(`  ${theme.style('│', 'border')} ${padLine(theme.style(truncateText(wrapped, inner), color), inner)} ${theme.style('│', 'border')}`);
      }
    }
    console.log(`  ${theme.style(`╰${'─'.repeat(width - 2)}╯`, 'border')}`);
    console.log('');
  }

  private applyLocalNotice(message: string): void {
    const notice = { at: new Date().toISOString(), role: 'System' as const, text: message };
    this.state = {
      ...this.state,
      current: { ...this.state.current, summary: message },
      missionFeed: [
        ...this.state.missionFeed,
        notice,
      ].slice(-120),
    };
    this.render(true);
  }

  private scheduleRender(): void {
    if (!this.active) return;
    const now = Date.now();
    if (now - this.lastRenderAt > 80) {
      this.render();
      return;
    }
    if (this.renderTimer) return;
    this.renderTimer = setTimeout(() => {
      this.renderTimer = null;
      this.render();
    }, 80);
  }

  private render(force = false): void {
    if (!this.active) return;
    const now = Date.now();
    if (!force && now - this.lastRenderAt < 50) return;
    this.lastRenderAt = now;

    this.renderer.clear();
    this.drawWorkspace();
    if (this.state.activeDrawer) this.drawDrawer(this.state.activeDrawer);
    this.renderer.flush();
  }

  private drawWorkspace(): void {
    const { width, height } = this.renderer.dimensions;
    const topH = 3;
    const statusH = 2;
    const inputH = 3;
    const activityH = Math.max(5, Math.min(8, Math.floor(height * 0.22)));
    const mainY = topH;
    const mainH = Math.max(8, height - topH - activityH - inputH - statusH);
    const sideW = Math.max(27, Math.min(36, Math.floor(width * 0.31)));
    const feedW = Math.max(40, width - sideW);
    const activityY = mainY + mainH;
    const inputY = activityY + activityH;
    const statusY = inputY + inputH;

    this.drawTopBar(width);
    this.drawMissionFeed(0, mainY, feedW, mainH);
    this.drawMissionInfo(feedW, mainY, sideW, mainH);
    this.drawActivityFeed(0, activityY, width, activityH);
    this.drawInputPrompt(0, inputY, width, inputH);
    this.drawStatusBar(0, statusY, width, statusH);
  }

  private drawTopBar(width: number): void {
    this.renderer.fillRect(0, 0, width, 3, { bg: theme.colors.background });
    const session = this.state.sessionId.slice(0, 8);
    const left = ` CodeThon OLED │ ${this.state.projectName} │ ${this.state.provider} │ ${this.state.model} │ Session ${session}`;
    const right = ` ${this.state.state} `;
    this.renderer.writeText(0, 0, truncateText(left, Math.max(10, width - right.length - 1)), { fg: theme.colors.accent, bold: true, bg: theme.colors.background });
    this.renderer.writeText(Math.max(0, width - right.length), 0, right, { fg: statusColor(this.state.state), bold: true, bg: theme.colors.background });
    this.renderer.writeText(1, 1, truncateText(`Goal: ${this.state.goal}`, width - 2), { fg: theme.colors.textBright, bg: theme.colors.background });
    this.drawHLine(0, 2, width, theme.colors.border);
  }

  private drawMissionFeed(x: number, y: number, width: number, height: number): void {
    this.renderer.drawBox(x, y, { width, height, title: ' Mission Feed ', color: 'primary', borderStyle: 'rounded' });
    const innerW = width - 4;
    const lines: string[] = [];
    for (const item of this.state.missionFeed.slice(-12)) {
      const stamp = timeOnly(item.at);
      const prefix = `${stamp} ${item.role}: `;
      const wrapped = wrapText(`${prefix}${item.text}`, innerW).slice(0, 3);
      lines.push(...wrapped);
    }
    if (this.state.liveModelText.trim()) {
      lines.push('', 'Live planning:');
      lines.push(...wrapText(cleanVisibleModelText(this.state.liveModelText), innerW).slice(-5));
    }
    const visible = lines.slice(-(height - 2));
    for (let i = 0; i < visible.length; i++) {
      this.renderer.writeText(x + 2, y + 1 + i, truncateText(visible[i], innerW), { fg: theme.colors.text });
    }
  }

  private drawMissionInfo(x: number, y: number, width: number, height: number): void {
    this.renderer.drawBox(x, y, { width, height, title: ' Mission Info ', color: 'accent', borderStyle: 'rounded' });
    const innerW = width - 4;
    const progress = progressBar(this.state.progress, Math.max(8, innerW - 12));
    const info = [
      ['Goal', truncateText(this.state.goal, innerW)],
      ['Progress', `${progress} ${this.state.progress}% · ${this.state.state.toLowerCase()}`],
      ['Stage', `${this.state.stageIndex}/${this.state.totalStages} ${this.state.stage}`],
      ['Current File', this.state.current.file || 'none'],
      ['Current Agent', this.state.current.agent],
      ['Current Tool', this.state.current.tool || 'none'],
      ['Files', `${this.state.metrics.filesModified} changed · ${this.state.context.files.length} in context`],
      ['Commands', `${this.state.metrics.commandsRun} run · ${this.state.metrics.failedTools} issues`],
      ['Tokens', `${compactNumber(this.state.metrics.tokensIn + this.state.metrics.tokensOut)}`],
      ['Cost', `$${this.state.metrics.estimatedCostUsd.toFixed(4)} est.`],
      ['Checkpoint', `#${this.state.metrics.checkpoints}`],
      ...(this.state.receipt ? [
        ['Receipt', this.state.receipt.reason.replace(/_/g, ' ')],
      ] as Array<[string, string]> : []),
    ];
    let row = y + 1;
    for (const [label, value] of info) {
      if (row >= y + height - 2) break;
      this.renderer.writeText(x + 2, row++, label, { fg: theme.colors.textDim, bold: true });
      if (row >= y + height - 1) break;
      this.renderer.writeText(x + 2, row++, truncateText(value, innerW), { fg: theme.colors.textBright });
    }
  }

  private drawActivityFeed(x: number, y: number, width: number, height: number): void {
    this.renderer.drawBox(x, y, { width, height, title: ' Activity Feed · Live Tool Stream ', color: 'info', borderStyle: 'rounded' });
    const innerW = width - 4;
    const events = this.state.activityFeed.filter(event => event.type !== 'STATE_CHANGED').slice(-(height - 2));
    if (events.length === 0) {
      this.renderer.writeText(x + 2, y + 1, 'Waiting for first runtime event...', { fg: theme.colors.textDim });
      return;
    }
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const icon = eventIcon(event.type);
      const target = event.target ? ` -> ${event.target}` : '';
      const duration = event.durationMs != null ? ` · ${event.durationMs}ms` : '';
      const line = `${timeOnly(event.timestamp)} │ ${event.type.replace(/_/g, ' ')} │ ${event.message}${target}${duration}`;
      this.renderer.writeText(x + 2, y + 1 + i, `${icon} ${truncateText(line, innerW - 2)}`, { fg: eventColor(event.type) });
    }
  }

  private drawInputPrompt(x: number, y: number, width: number, height: number): void {
    this.renderer.drawBox(x, y, { width, height, title: ' Prompt ', color: 'secondary', borderStyle: 'rounded' });
    const text = this.state.state === 'COMPLETED'
      ? '> Completed. Receipt is inside this workspace. Next: /inspect, /replay, /diff, or /execute <goal>.'
      : this.state.state === 'FAILED' || this.state.state === 'CANCELLED'
        ? '> Halted. Inspect drawers, then retry or adjust the goal.'
        : '> Agent is running. Esc or Ctrl+C cancels. Ctrl+M Mission · Ctrl+I Context.';
    this.renderer.writeText(x + 2, y + 1, truncateText(text, width - 4), { fg: theme.colors.textBright });
  }

  private drawStatusBar(x: number, y: number, width: number, height: number): void {
    this.renderer.fillRect(x, y, width, height, { bg: theme.colors.background });
    const telemetry = [
      `Model ${this.state.model}`,
      `Context ${this.state.metrics.contextPercent}%`,
      `Tokens ${compactNumber(this.state.metrics.tokensIn + this.state.metrics.tokensOut)}`,
      `Cost $${this.state.metrics.estimatedCostUsd.toFixed(4)}`,
      `Checkpoint #${this.state.metrics.checkpoints}`,
      `State ${this.state.state}`,
    ].join(' │ ');
    this.renderer.writeText(x + 1, y, truncateText(telemetry, width - 2), { fg: theme.colors.textBright, bg: theme.colors.background });
    this.renderer.writeText(x + 1, y + 1, truncateText(SHORTCUTS.join(' │ '), width - 2), { fg: theme.colors.textDim, bg: theme.colors.background });
  }

  private drawDrawer(drawer: Exclude<V4Drawer, null>): void {
    const { width, height } = this.renderer.dimensions;
    const x = 2;
    const y = 3;
    const w = Math.max(60, width - 4);
    const h = Math.max(16, height - 6);
    const title = drawerTitle(drawer);
    this.renderer.fillRect(x, y, w, h, { bg: theme.colors.background });
    this.renderer.drawBox(x, y, { width: w, height: h, title: ` ${title} `, color: 'accent', borderStyle: 'double' });
    const lines = drawerLines(drawer, this.state, w - 4, h - 2);
    for (let i = 0; i < lines.length && i < h - 2; i++) {
      this.renderer.writeText(x + 2, y + 1 + i, truncateText(lines[i], w - 4), { fg: drawerLineColor(lines[i]) });
    }
  }

  private drawHLine(x: number, y: number, width: number, color: RGB): void {
    for (let col = 0; col < width; col++) this.renderer.setPixel(x + col, y, '─', { fg: color });
  }
}

function drawerForKey(key: Key): V4Drawer | undefined {
  const sequence = key.sequence || '';
  if (key.name === 'escape' || sequence === '\x1b') return null;
  if (key.name === 'return' || sequence === '\r' || sequence === '\n') return 'mission';
  if (key.name === 'tab' || sequence === '\t') return 'context';
  if ((key.ctrl && key.name === 'k') || sequence === '\x0b') return 'palette';
  if ((key.ctrl && key.name === 'm') || sequence === '\r') return 'mission';
  if ((key.ctrl && key.name === 't') || sequence === '\x14') return 'trace';
  if ((key.ctrl && key.name === 'i') || sequence === '\x09') return 'context';
  if ((key.ctrl && key.name === 'd') || sequence === '\x04') return 'diff';
  if ((key.ctrl && key.name === 'a') || sequence === '\x01') return 'agents';
  if ((key.ctrl && key.name === 'y') || sequence === '\x19') return null;
  return undefined;
}

function isRunningState(state: string): boolean {
  return state !== 'COMPLETED' && state !== 'FAILED' && state !== 'CANCELLED';
}

function drawerTitle(drawer: Exclude<V4Drawer, null>): string {
  if (drawer === 'mission') return 'Mission Control';
  if (drawer === 'trace') return 'High-Fidelity Activity Trace';
  if (drawer === 'context') return 'Context Inspector';
  if (drawer === 'diff') return 'Diff Inspector';
  if (drawer === 'agents') return 'Multi-Agent Matrix';
  return 'Command Palette';
}

function drawerLines(drawer: Exclude<V4Drawer, null>, state: V4RuntimeViewState, width: number, height: number): string[] {
  if (drawer === 'mission') {
    return [
      `Goal: ${state.goal}`,
      `Progress: ${state.progress}% · Stage ${state.stageIndex}/${state.totalStages} · ${state.stage}`,
      `Active Agent: ${state.current.agent}`,
      `Current Tool: ${state.current.tool || 'none'}`,
      `Current File: ${state.current.file || 'none'}`,
      `Metrics: ${state.metrics.filesModified} files · ${state.metrics.commandsRun} commands · ${state.metrics.failedTools} failures · ${state.metrics.checkpoints} checkpoints`,
      '',
      'Recent Mission Feed:',
      ...state.missionFeed.slice(-Math.max(4, height - 10)).flatMap(item => wrapText(`${timeOnly(item.at)} ${item.role}: ${item.text}`, width)),
    ];
  }

  if (drawer === 'trace') {
    return state.activityFeed.slice(-Math.max(8, height - 2)).map(event => {
      const duration = event.durationMs == null ? '' : ` | Duration: ${event.durationMs}ms`;
      const target = event.target ? ` | Target: ${event.target}` : '';
      return `${timeOnly(event.timestamp)} | ${event.type} | ${event.tool || 'runtime'}${target} | ${event.message}${duration}`;
    });
  }

  if (drawer === 'context') {
    const tokenLines = state.context.tokenDistribution.map(item => `${item.label.padEnd(10)} ${bar(item.tokens, Math.max(1, state.metrics.tokensIn + state.metrics.tokensOut), 24)} ${item.tokens.toLocaleString()} tokens`);
    return [
      `Context Window: ${state.metrics.contextPercent}% estimated`,
      `Injected/Observed Files: ${state.context.files.length}`,
      `Memory Entries: ${state.context.memory.length}`,
      '',
      'Token Distribution:',
      ...tokenLines,
      '',
      'Files:',
      ...(state.context.files.length ? state.context.files.slice(-Math.max(4, height - 12)) : ['No file context captured yet.']),
    ];
  }

  if (drawer === 'diff') {
    return [
      'Diff Inspector',
      'Use ct diff after the run for the complete side-by-side + unified git diff.',
      '',
      'Files touched this session:',
      ...(state.diffs.length
        ? state.diffs.slice(-Math.max(5, height - 6)).map(diff => `${diff.status.toUpperCase().padEnd(8)} ${diff.file}  +${diff.added} -${diff.removed}`)
        : ['No file updates recorded yet.']),
      '',
      '[A] Approve  [R] Reject  [U] Rollback  [C] Copy',
    ];
  }

  if (drawer === 'agents') {
    return state.agents.map(agent => formatAgent(agent));
  }

  return [
    'Command Palette',
    '/execute <goal>    Run autonomous execution workspace',
    '/inspect [runId]   Inspect execution journal',
    '/replay [runId]    Replay activity timeline',
    '/diff              Review current changes',
    '/memory            Explore project memory',
    '/analytics         Show reliability metrics',
    '/graph             Visualize repository architecture',
  ];
}

function formatAgent(agent: V4AgentRow): string {
  return `${agentStatusIcon(agent.status)} ${agent.name.padEnd(12)} ${agent.status.padEnd(9)} ${agent.detail}`;
}

function progressBar(percent: number, width: number): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, width - filled))}`;
}

function bar(value: number, max: number, width: number): string {
  const filled = Math.round((Math.max(0, Math.min(max, value)) / max) * width);
  return `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, width - filled))}`;
}

function eventIcon(type: RuntimeEvent['type']): string {
  if (type.endsWith('FAILED')) return '▲';
  if (type === 'TASK_COMPLETED' || type === 'TOOL_COMPLETED' || type === 'FILE_UPDATED' || type === 'COMMAND_EXECUTED') return '◆';
  if (type === 'TOOL_STARTED' || type === 'PLAN_CREATED') return '▶';
  if (type === 'CHECKPOINT_CREATED') return '▣';
  return '●';
}

function eventColor(type: RuntimeEvent['type']): RGB {
  if (type.endsWith('FAILED')) return theme.colors.error;
  if (type === 'TASK_COMPLETED' || type === 'TOOL_COMPLETED' || type === 'FILE_UPDATED' || type === 'COMMAND_EXECUTED') return theme.colors.success;
  if (type === 'CHECKPOINT_CREATED') return theme.colors.textDim;
  if (type === 'TOOL_STARTED' || type === 'PLAN_CREATED') return theme.colors.accent;
  return theme.colors.text;
}

function drawerLineColor(line: string): RGB {
  if (/FAILED|failed|Issue|Halted|Rollback|Reject/i.test(line)) return theme.colors.warning;
  if (/COMPLETE|Complete|◆|Approve|APPLIED|VERIFIED/i.test(line)) return theme.colors.success;
  if (/Goal:|Progress:|Token|Files:|Diff Inspector|Command Palette|Context Window|Active Agent/i.test(line)) return theme.colors.accent;
  return theme.colors.text;
}

function agentStatusIcon(status: V4AgentRow['status']): string {
  if (status === 'complete') return '◆';
  if (status === 'running') return '●';
  if (status === 'thinking') return '▣';
  if (status === 'failed') return '■';
  if (status === 'warning') return '▲';
  if (status === 'waiting') return '◼';
  return ' ';
}

function statusColor(state: string): RGB {
  if (state === 'COMPLETED') return theme.colors.success;
  if (state === 'CANCELLED') return theme.colors.warning;
  if (state === 'FAILED') return theme.colors.error;
  if (state === 'WAITING_FOR_APPROVAL' || state === 'CHECKPOINTING') return theme.colors.warning;
  return theme.colors.accent;
}

function timeOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--:--';
  return date.toLocaleTimeString([], { hour12: false });
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function cleanVisibleModelText(value: string): string {
  return stripAnsi(value)
    .replace(/<TOOL_CALL>[\s\S]*?<\/TOOL_CALL>/g, ' ')
    .replace(/TOOL_CALL:\s*\{[\s\S]*?\}(?=\s|$)/g, ' ')
    .replace(/(?:^|[\s{,])"?tool"?\s*:\s*"[^"]+"\s*,\s*"?args"?\s*:\s*\{[^}]*\}\s*\}?/g, ' ')
    .replace(/\b(?:read_file|write_file|list_directory|grep_search|search_files|web_search|crawl_url|run_command)"\s*,\s*"?args"?\s*:\s*\{[^}]*\}\s*\}?/g, ' ')
    .replace(/<TOOL_CALL>[\s\S]*$/g, ' ')
    .replace(/TOOL_CALL:\s*\{[\s\S]*$/g, ' ')
    .replace(/(?:^|[\s{,])"?tool"?\s*:\s*"[^"]+"\s*,\s*"?args"?\s*:\s*\{[\s\S]*$/g, ' ')
    .replace(/\b(?:read_file|write_file|list_directory|grep_search|search_files|web_search|crawl_url|run_command)"\s*,\s*"?args"?\s*:\s*\{[\s\S]*$/g, ' ')
    .replace(/\{[^\n{}]*"tool"[^\n{}]*"args"[\s\S]*$/g, ' ')
    .replace(/<\/?TOOL_CALL>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function padLine(value: string, width: number): string {
  return value + ' '.repeat(Math.max(0, width - stripAnsi(value).length));
}

function formatElapsed(elapsedSeconds: number): string {
  const seconds = Math.max(0, Math.round(elapsedSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}m ${rest}s` : `${rest}s`;
}

function finalLineColor(line: string): keyof typeof theme.colors {
  if (!line.trim()) return 'textDim';
  if (/^Completion Receipt|^Verification|^Next:/.test(line)) return 'accent';
  if (/^◆/.test(line)) return 'success';
  if (/^▲/.test(line)) return 'warning';
  if (/^Goal:|^Result:|^Reason:|^Journal:/.test(line)) return 'textBright';
  return 'text';
}
