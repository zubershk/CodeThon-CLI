import chalk from 'chalk';
import type { RuntimeEvent } from '../events/types';
import type { ExecutionRunMeta } from '../journal/execution-journal';
import { theme } from './theme';
import { stripAnsi, truncateText } from './terminal-text';

interface SessionRow {
  run: ExecutionRunMeta;
  events: RuntimeEvent[];
}

interface HomeOptions {
  project: any;
  projectId: string | null;
  provider: string;
  model: string;
  credentialsReady: boolean;
  runs: SessionRow[];
}

interface ExecuteStartOptions {
  goal: string;
  model: string;
  sessionId: string;
  journalPath: string;
  askMode: boolean;
  dryRun: boolean;
}

export interface DiffFileSummary {
  path: string;
  status: string;
  added: number;
  removed: number;
}

export interface AnalyticsSummary {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  cancelledRuns: number;
  successRate: number;
  averageDurationSeconds: number;
  totalEvents: number;
  filesChanged: number;
  commandsExecuted: number;
  commandFailures: number;
  checkpoints: number;
  recoveries: number;
}

export interface RepositoryGraphSummary {
  root: string;
  techStack: string[];
  entryPoints: string[];
  routes: string[];
  apiRoutes: string[];
  components: string[];
  services: string[];
  dataFiles: string[];
  dependencies: string[];
}

const PIPELINE = ['Analyze', 'Plan', 'Execute', 'Verify', 'Reflect', 'Complete'];

function width(max = 112): number {
  return Math.max(72, Math.min(max, (process.stdout.columns || 96) - 4));
}

function pad(text: string, target: number): string {
  const clean = stripAnsi(text);
  return text + ' '.repeat(Math.max(0, target - clean.length));
}

function line(label = '', max = 112): void {
  const w = width(max);
  const title = label ? ` ${label} ` : '';
  const fill = Math.max(0, w - title.length);
  console.log(`  ${theme.style(title + '─'.repeat(fill), 'border')}`);
}

function nav(title: string, section: string): void {
  const w = width(120);
  const left = `${title}  ${chalk.hex('#899691')('›')}  ${section}`;
  const right = new Date().toLocaleTimeString();
  const gap = Math.max(2, w - stripAnsi(left).length - stripAnsi(right).length);
  console.log('');
  console.log(`  ${theme.style('╭' + '─'.repeat(w) + '╮', 'border')}`);
  console.log(`  ${theme.style('│', 'border')} ${theme.style(left, 'accent', 'bold')}${' '.repeat(gap)}${theme.style(right, 'textDim')} ${theme.style('│', 'border')}`);
  console.log(`  ${theme.style('╰' + '─'.repeat(w) + '╯', 'border')}`);
}

function twoCol(leftTitle: string, leftLines: string[], rightTitle: string, rightLines: string[]): void {
  const w = width(120);
  const col = Math.floor((w - 5) / 2);
  const rows = Math.max(leftLines.length, rightLines.length, 1);
  console.log(`  ${theme.style('┌' + '─'.repeat(col + 2) + '┬' + '─'.repeat(col + 2) + '┐', 'border')}`);
  console.log(`  ${theme.style('│', 'border')} ${theme.style(pad(leftTitle, col), 'accent', 'bold')} ${theme.style('│', 'border')} ${theme.style(pad(rightTitle, col), 'accent', 'bold')} ${theme.style('│', 'border')}`);
  console.log(`  ${theme.style('├' + '─'.repeat(col + 2) + '┼' + '─'.repeat(col + 2) + '┤', 'border')}`);
  for (let i = 0; i < rows; i++) {
    console.log(`  ${theme.style('│', 'border')} ${pad(truncateText(leftLines[i] || '', col), col)} ${theme.style('│', 'border')} ${pad(truncateText(rightLines[i] || '', col), col)} ${theme.style('│', 'border')}`);
  }
  console.log(`  ${theme.style('└' + '─'.repeat(col + 2) + '┴' + '─'.repeat(col + 2) + '┘', 'border')}`);
}

function duration(run: ExecutionRunMeta): string {
  const end = run.completedAt ? Date.parse(run.completedAt) : Date.now();
  const seconds = Math.max(0, Math.floor((end - Date.parse(run.startedAt)) / 1000));
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function statusColor(status: ExecutionRunMeta['status']): (value: string) => string {
  if (status === 'completed') return chalk.hex('#82f7a6');
  if (status === 'running') return chalk.hex('#74d7ff');
  if (status === 'cancelled') return chalk.hex('#ffcf5c');
  return chalk.hex('#ff5c7a');
}

function filesChanged(events: RuntimeEvent[]): string[] {
  return Array.from(new Set(events.filter(event => event.type === 'FILE_UPDATED' && event.target).map(event => event.target!)));
}

function commandCount(events: RuntimeEvent[]): number {
  return events.filter(event => event.type === 'COMMAND_EXECUTED' || event.type === 'COMMAND_FAILED').length;
}

function checkpointCount(events: RuntimeEvent[]): number {
  return events.filter(event => event.type === 'CHECKPOINT_CREATED').length;
}

function stageForEvent(event: RuntimeEvent): string {
  if (event.type === 'TASK_STARTED') return 'Analyze';
  if (event.type === 'PLAN_CREATED' || event.type === 'MODEL_CALLED') return 'Plan';
  if (event.type === 'TOOL_STARTED' || event.type === 'TOOL_COMPLETED' || event.type === 'FILE_UPDATED') return 'Execute';
  if (event.type === 'COMMAND_EXECUTED' || event.type === 'COMMAND_FAILED') return 'Verify';
  if (event.type === 'TOOL_FAILED' || event.type === 'TASK_FAILED') return 'Reflect';
  if (event.type === 'TASK_COMPLETED' || event.type === 'RECEIPT_CREATED') return 'Complete';
  return 'Analyze';
}

function progressLine(events: RuntimeEvent[], status?: ExecutionRunMeta['status']): string {
  const active = events.length > 0 ? stageForEvent(events[events.length - 1]) : 'Analyze';
  return PIPELINE.map(stage => {
    const reached = events.some(event => stageForEvent(event) === stage) || (status === 'completed' && stage === 'Complete');
    if (stage === active && status !== 'completed') return chalk.hex('#74d7ff')(`[${stage}]`);
    if (reached) return chalk.hex('#82f7a6')(`◆ ${stage}`);
    return chalk.hex('#899691')(stage);
  }).join(chalk.hex('#899691')('  ->  '));
}

export function renderHomeScreen(options: HomeOptions): void {
  nav('CodeThon', 'Home');

  const projectLines = [
    `Repository    ${chalk.hex('#f7fff9')(process.cwd())}`,
    `Project       ${chalk.hex('#f7fff9')(options.project?.name || 'No active project')}`,
    `Project ID    ${chalk.hex('#f7fff9')(options.projectId || 'N/A')}`,
    `Phase         ${chalk.hex('#f7fff9')(options.project?.sprintPhase || 'Not started')}`,
    `Stack         ${chalk.hex('#f7fff9')(options.project?.stack || 'Unknown')}`,
  ];
  const systemLines = [
    `Model         ${chalk.hex('#f7fff9')(options.model || 'Not set')}`,
    `Provider      ${chalk.hex('#f7fff9')(options.provider)}`,
    `Credentials   ${options.credentialsReady ? chalk.hex('#82f7a6')('Loaded') : chalk.hex('#ff5c7a')('Missing')}`,
    `Memory        ${chalk.hex('#f7fff9')(options.project ? 'Project state available' : 'No project memory')}`,
    `Agent Health  ${options.credentialsReady ? chalk.hex('#82f7a6')('Ready') : chalk.hex('#ffcf5c')('Setup required')}`,
  ];
  twoCol('Project', projectLines, 'Agent Runtime', systemLines);

  const recent = options.runs.slice(0, 5);
  line('Recent Sessions');
  if (recent.length === 0) {
    console.log(`  ${chalk.hex('#899691')('No sessions yet. Start with')} ${chalk.hex('#74d7ff')('ct execute "build a feature"')} ${chalk.hex('#899691')('or')} ${chalk.hex('#74d7ff')('/execute <goal>')}`);
  } else {
    for (const { run, events } of recent) {
      const color = statusColor(run.status);
      const changed = filesChanged(events).length;
      console.log(`  ${color(run.status.padEnd(9))} ${chalk.hex('#f7fff9')(truncateText(run.goal, 54))} ${chalk.hex('#899691')(duration(run).padStart(8))} ${chalk.hex('#899691')(`${changed} files · ${events.length} events · ${run.runId}`)}`);
    }
  }

  line('Quick Actions');
  console.log(`  ${chalk.hex('#74d7ff')('/execute <goal>')}  ${chalk.hex('#899691')('Run autonomous execution with journal + checkpoints')}`);
  console.log(`  ${chalk.hex('#74d7ff')('/inspect')}         ${chalk.hex('#899691')('Inspect the latest session')}`);
  console.log(`  ${chalk.hex('#74d7ff')('/replay')}          ${chalk.hex('#899691')('Replay an execution timeline')}`);
  console.log(`  ${chalk.hex('#74d7ff')('/plan <goal>')}     ${chalk.hex('#899691')('Create a plan before changing files')}`);
  renderStatusBar([
    options.credentialsReady ? 'AI ready' : 'Setup needed',
    options.model || 'No model',
    `${options.runs.length} sessions`,
    options.project?.name || 'No project',
  ]);
}

export function renderSessionDashboard(rows: SessionRow[]): void {
  nav('CodeThon', 'Sessions');
  if (rows.length === 0) {
    console.log(`  ${chalk.hex('#899691')('No sessions found. Run')} ${chalk.hex('#74d7ff')('ct execute "<goal>"')} ${chalk.hex('#899691')('to create the first execution journal.')}`);
    return;
  }

  line('Execution Sessions');
  for (const { run, events } of rows.slice(0, 12)) {
    const color = statusColor(run.status);
    const changed = filesChanged(events).length;
    const commands = commandCount(events);
    const checkpoints = checkpointCount(events);
    console.log(`  ${color(run.status.padEnd(9))} ${chalk.hex('#f7fff9')(truncateText(run.goal, 46))} ${chalk.hex('#899691')(duration(run).padStart(7))} ${chalk.hex('#899691')(`${changed} files · ${commands} cmds · ${checkpoints} checkpoints`)}`);
    console.log(`  ${chalk.hex('#899691')('          ' + run.runId)}`);
  }
}

export function renderRunInspect(run: ExecutionRunMeta, events: RuntimeEvent[]): void {
  nav('CodeThon', 'Inspect Session');
  const changed = filesChanged(events);
  const failed = events.filter(event => event.type.endsWith('FAILED'));
  twoCol('Session', [
    `Run          ${run.runId}`,
    `Status       ${statusColor(run.status)(run.status)}`,
    `Duration     ${duration(run)}`,
    `Events       ${events.length}`,
    `Checkpoints  ${checkpointCount(events)}`,
  ], 'Task', [
    `Goal         ${run.goal}`,
    `Files        ${changed.length}`,
    `Commands     ${commandCount(events)}`,
    `Failures     ${failed.length}`,
    `Progress     ${stripAnsi(progressLine(events, run.status))}`,
  ]);

  if (changed.length > 0) {
    line('Files Changed');
    for (const file of changed.slice(0, 12)) console.log(`  ${chalk.hex('#82f7a6')('◆')} ${file}`);
  }

  if (run.summary) {
    line('Summary');
    console.log(`  ${run.summary.replace(/\n/g, '\n  ')}`);
  }

  renderTimeline(events.slice(-14), Date.parse(run.startedAt));
}

export function renderReplayTimeline(runId: string, events: RuntimeEvent[]): void {
  nav('CodeThon', 'Replay');
  console.log(`  ${chalk.hex('#899691')('Run')} ${chalk.hex('#f7fff9')(runId)}  ${chalk.hex('#899691')(`${events.length} events`)}`);
  renderTimeline(events, events.length > 0 ? Date.parse(events[0].timestamp) : Date.now());
}

export function renderExecuteStart(options: ExecuteStartOptions): void {
  nav('CodeThon', 'Auto Runtime');
  twoCol('Objective', [
    `Goal        ${options.goal}`,
    `Model       ${options.model}`,
    `Session     ${options.sessionId}`,
  ], 'Control', [
    `Journal     ${options.journalPath}`,
    `Approvals   ${options.askMode ? 'on' : 'off'}`,
    `Dry Run     ${options.dryRun ? 'on' : 'off'}`,
  ]);
  console.log(`  ${progressLine([], 'running' as any)}`);
  line('Live Activity');
}

export function renderRuntimeEventLine(event: RuntimeEvent, startMs: number): void {
  const elapsed = Math.max(0, Math.floor((Date.parse(event.timestamp) - startMs) / 1000));
  const time = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
  const stage = stageForEvent(event).padEnd(8);
  const target = event.target ? chalk.hex('#899691')(` -> ${truncateText(event.target, 38)}`) : '';
  const type = event.type.toLowerCase().replace(/_/g, ' ');
  const color = event.type.endsWith('FAILED') ? chalk.hex('#ff5c7a')
    : event.type === 'TASK_COMPLETED' || event.type === 'FILE_UPDATED' || event.type === 'RECEIPT_CREATED' ? chalk.hex('#82f7a6')
    : event.type === 'CHECKPOINT_CREATED' || event.type === 'MODEL_CALLED' ? chalk.hex('#899691')
    : chalk.hex('#74d7ff');
  console.log(`  ${chalk.hex('#899691')(time.padStart(5))} ${chalk.hex('#d7a3ff')(stage)} ${color(type.padEnd(21))} ${truncateText(event.message, 78)}${target}`);
}

function renderTimeline(events: RuntimeEvent[], startMs: number): void {
  line('Timeline');
  if (events.length === 0) {
    console.log(`  ${chalk.hex('#899691')('No events recorded.')}`);
    return;
  }
  for (const event of events) renderRuntimeEventLine(event, startMs);
}

export function renderStatusBar(items: string[]): void {
  const w = width(120);
  const text = items.map(item => ` ${item} `).join(chalk.hex('#899691')('│'));
  console.log('');
  console.log(`  ${theme.style('─'.repeat(w), 'border')}`);
  console.log(`  ${chalk.hex('#899691')(truncateText(stripAnsi(text), w))}`);
}

export function renderDiffViewer(files: DiffFileSummary[], diff: string): void {
  nav('CodeThon', 'Diff Viewer');
  if (files.length === 0 && !diff.trim()) {
    console.log(`  ${chalk.hex('#899691')('No local git diff found. The working tree has no unstaged changes.')}`);
    return;
  }

  const added = files.reduce((sum, file) => sum + file.added, 0);
  const removed = files.reduce((sum, file) => sum + file.removed, 0);
  twoCol('Summary', [
    `Files        ${files.length}`,
    `Added        ${chalk.hex('#82f7a6')(`+${added}`)}`,
    `Removed      ${chalk.hex('#ff5c7a')(`-${removed}`)}`,
    `Mode         side-by-side + unified`,
  ], 'Controls', [
    'Inspect      ct diff / /diff',
    'Stage        git add <file>',
    'Revert       git restore <file>',
    'Review       ct review',
  ]);

  if (files.length > 0) {
    line('Files Changed');
    for (const file of files.slice(0, 20)) {
      console.log(`  ${chalk.hex('#74d7ff')(file.status.padEnd(3))} ${truncateText(file.path, 64)} ${chalk.hex('#82f7a6')(`+${file.added}`)} ${chalk.hex('#ff5c7a')(`-${file.removed}`)}`);
    }
  }

  renderSideBySideDiff(diff);

  line('Unified Diff');
  const lines = diff.split(/\r?\n/).slice(0, 360);
  for (const raw of lines) {
    const text = truncateText(raw, width(132) - 4);
    if (raw.startsWith('+++') || raw.startsWith('---') || raw.startsWith('diff --git')) console.log(`  ${chalk.hex('#d7a3ff')(text)}`);
    else if (raw.startsWith('@@')) console.log(`  ${chalk.hex('#74d7ff')(text)}`);
    else if (raw.startsWith('+')) console.log(`  ${chalk.hex('#82f7a6')(text)}`);
    else if (raw.startsWith('-')) console.log(`  ${chalk.hex('#ff5c7a')(text)}`);
    else console.log(`  ${chalk.hex('#899691')(text)}`);
  }
  if (diff.split(/\r?\n/).length > lines.length) {
    console.log(`  ${chalk.hex('#899691')(`... truncated ${diff.split(/\r?\n/).length - lines.length} lines`)}`);
  }
}

export function renderMemoryExplorer(project: any, query = ''): void {
  nav('CodeThon', 'Memory Explorer');
  if (!project) {
    console.log(`  ${chalk.hex('#899691')('No active project memory. Run')} ${chalk.hex('#74d7ff')('/init')} ${chalk.hex('#899691')('inside ct, or')} ${chalk.hex('#74d7ff')('ct init')} ${chalk.hex('#899691')('from your shell.')}`);
    return;
  }

  const nodes = Array.isArray(project.memoryGraph) ? project.memoryGraph : [];
  const filtered = query
    ? nodes.filter((node: any) => `${node.type} ${node.content} ${(node.tags || []).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    : nodes;
  const byType = nodes.reduce((acc: Record<string, number>, node: any) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {});

  twoCol('Project Memory', [
    `Project      ${project.name}`,
    `Nodes        ${nodes.length}`,
    `Filtered     ${filtered.length}`,
    `Query        ${query || 'none'}`,
  ], 'Types', Object.entries(byType).map(([type, count]) => `${type.padEnd(12)} ${count}`));

  line('Stored Knowledge');
  if (filtered.length === 0) {
    console.log(`  ${chalk.hex('#899691')('No memory entries match this query.')}`);
    return;
  }
  for (const node of filtered.slice(0, 24)) {
    const tags = (node.tags || []).length > 0 ? chalk.hex('#899691')(` #${node.tags.join(' #')}`) : '';
    console.log(`  ${chalk.hex('#74d7ff')(String(node.type).padEnd(10))} ${chalk.hex('#f7fff9')(truncateText(node.content, 82))}`);
    console.log(`  ${chalk.hex('#899691')(String(node.id))} ${tags}`);
  }
}

export function renderAnalyticsDashboard(summary: AnalyticsSummary): void {
  nav('CodeThon', 'Analytics');
  twoCol('Execution', [
    `Runs         ${summary.totalRuns}`,
    `Completed    ${summary.completedRuns}`,
    `Failed       ${summary.failedRuns}`,
    `Cancelled    ${summary.cancelledRuns}`,
    `Success      ${summary.successRate}%`,
  ], 'Runtime', [
    `Avg Time     ${summary.averageDurationSeconds}s`,
    `Events       ${summary.totalEvents}`,
    `Files        ${summary.filesChanged}`,
    `Commands     ${summary.commandsExecuted}`,
    `Checkpoints  ${summary.checkpoints}`,
  ]);

  line('Performance Bars');
  bar('Success Rate', summary.successRate, 100);
  bar('Verification Pass', summary.commandsExecuted === 0 ? 100 : Math.round(((summary.commandsExecuted - summary.commandFailures) / summary.commandsExecuted) * 100), 100);
  bar('Recovery Events', Math.min(summary.recoveries, 20), 20);
}

export function renderRepositoryGraph(summary: RepositoryGraphSummary): void {
  nav('CodeThon', 'Repository Graph');
  twoCol('Repository', [
    `Root         ${summary.root}`,
    `Stack        ${summary.techStack.join(', ') || 'Unknown'}`,
    `Entries      ${summary.entryPoints.length}`,
    `Deps         ${summary.dependencies.length}`,
  ], 'Architecture', [
    `Routes       ${summary.routes.length}`,
    `API          ${summary.apiRoutes.length}`,
    `Components   ${summary.components.length}`,
    `Services     ${summary.services.length}`,
    `Data         ${summary.dataFiles.length}`,
  ]);

  renderRepositoryMap(summary);

  graphSection('Entry Points', summary.entryPoints);
  graphSection('Routes', summary.routes);
  graphSection('API Routes', summary.apiRoutes);
  graphSection('Components', summary.components);
  graphSection('Services', summary.services);
  graphSection('Data Layer', summary.dataFiles);
  graphSection('Dependencies', summary.dependencies.slice(0, 30));
}

function graphSection(title: string, items: string[]): void {
  line(title);
  if (items.length === 0) {
    console.log(`  ${chalk.hex('#899691')('No nodes detected.')}`);
    return;
  }
  for (const item of items.slice(0, 18)) console.log(`  ${chalk.hex('#899691')('├─')} ${truncateText(item, 92)}`);
  if (items.length > 18) console.log(`  ${chalk.hex('#899691')(`└─ ${items.length - 18} more`)}`);
}

function renderSideBySideDiff(diff: string): void {
  const rows: Array<[string, string]> = [];
  let currentFile = '';
  for (const raw of diff.split(/\r?\n/)) {
    if (rows.length >= 90) break;
    if (raw.startsWith('diff --git')) {
      currentFile = raw.replace(/^diff --git a\//, '').replace(/ b\/.*$/, '');
      rows.push([chalk.hex('#d7a3ff')(`file ${currentFile}`), chalk.hex('#d7a3ff')(`file ${currentFile}`)]);
      continue;
    }
    if (raw.startsWith('@@')) {
      rows.push([chalk.hex('#74d7ff')(raw), chalk.hex('#74d7ff')(raw)]);
      continue;
    }
    if (raw.startsWith('---') || raw.startsWith('+++') || raw.startsWith('index ')) continue;
    if (raw.startsWith('-')) {
      rows.push([chalk.hex('#ff5c7a')(raw.slice(1)), chalk.hex('#899691')('')]);
      continue;
    }
    if (raw.startsWith('+')) {
      rows.push([chalk.hex('#899691')(''), chalk.hex('#82f7a6')(raw.slice(1))]);
      continue;
    }
    if (raw.startsWith(' ')) {
      const value = chalk.hex('#899691')(raw.slice(1));
      rows.push([value, value]);
    }
  }

  if (rows.length === 0) return;

  const w = width(132);
  const col = Math.max(28, Math.floor((w - 5) / 2));
  line('Side-by-side Preview');
  console.log(`  ${theme.style('┌' + '─'.repeat(col + 2) + '┬' + '─'.repeat(col + 2) + '┐', 'border')}`);
  console.log(`  ${theme.style('│', 'border')} ${theme.style(pad('Before', col), 'accent', 'bold')} ${theme.style('│', 'border')} ${theme.style(pad('After', col), 'accent', 'bold')} ${theme.style('│', 'border')}`);
  console.log(`  ${theme.style('├' + '─'.repeat(col + 2) + '┼' + '─'.repeat(col + 2) + '┤', 'border')}`);
  for (const [left, right] of rows) {
    console.log(`  ${theme.style('│', 'border')} ${pad(truncateText(left, col), col)} ${theme.style('│', 'border')} ${pad(truncateText(right, col), col)} ${theme.style('│', 'border')}`);
  }
  console.log(`  ${theme.style('└' + '─'.repeat(col + 2) + '┴' + '─'.repeat(col + 2) + '┘', 'border')}`);
  if (diff.split(/\r?\n/).length > rows.length) {
    console.log(`  ${chalk.hex('#899691')('Preview capped. Unified diff below keeps more context.')}`);
  }
}

function renderRepositoryMap(summary: RepositoryGraphSummary): void {
  line('Architecture Map');
  console.log(`  ${chalk.hex('#74d7ff')('Repository')}`);
  console.log(`  ${chalk.hex('#899691')('├─')} ${chalk.hex('#f7fff9')('Entry points')} ${chalk.hex('#899691')(`(${summary.entryPoints.length})`)}`);
  console.log(`  ${chalk.hex('#899691')('│  ├─')} ${chalk.hex('#f7fff9')('Routes')} ${chalk.hex('#899691')(`(${summary.routes.length})`)} ${chalk.hex('#899691')('render UI and pages')}`);
  console.log(`  ${chalk.hex('#899691')('│  │  └─')} ${chalk.hex('#f7fff9')('Components')} ${chalk.hex('#899691')(`(${summary.components.length})`)} ${chalk.hex('#899691')('compose reusable interface pieces')}`);
  console.log(`  ${chalk.hex('#899691')('│  └─')} ${chalk.hex('#f7fff9')('API routes')} ${chalk.hex('#899691')(`(${summary.apiRoutes.length})`)} ${chalk.hex('#899691')('handle server-side requests')}`);
  console.log(`  ${chalk.hex('#899691')('├─')} ${chalk.hex('#f7fff9')('Services / utilities')} ${chalk.hex('#899691')(`(${summary.services.length})`)} ${chalk.hex('#899691')('shared runtime behavior')}`);
  console.log(`  ${chalk.hex('#899691')('├─')} ${chalk.hex('#f7fff9')('Data layer')} ${chalk.hex('#899691')(`(${summary.dataFiles.length})`)} ${chalk.hex('#899691')('database, schema, and persistence files')}`);
  console.log(`  ${chalk.hex('#899691')('└─')} ${chalk.hex('#f7fff9')('Dependencies')} ${chalk.hex('#899691')(`(${summary.dependencies.length})`)} ${chalk.hex('#899691')('external packages')}`);
}

function bar(label: string, value: number, max: number): void {
  const ratio = max === 0 ? 0 : Math.max(0, Math.min(1, value / max));
  const filled = Math.round(ratio * 32);
  const empty = 32 - filled;
  console.log(`  ${label.padEnd(20)} ${chalk.hex('#82f7a6')('█'.repeat(filled))}${chalk.hex('#899691')('░'.repeat(empty))} ${value}${max === 100 ? '%' : ''}`);
}
