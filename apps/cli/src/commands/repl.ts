import readline from 'readline';
import chalk from 'chalk';
import { cursorTo, moveCursor, clearScreenDown } from 'readline';
import { StateManager } from '../cil/state-manager';
import { getLLMConfig, getThemeMode, setThemeMode } from '../utils/config';
import { logger } from '../utils';
import { naturalLanguageCommand } from './nl';
import { theme } from '../ui/theme';
import { KeyBindingManager } from '../ui/keybindings';
import { buildPromptLayout, stripAnsi, truncateText } from '../ui/terminal-text';
import { buildSuggestedActions } from '../utils/experience';
import { getProviderDisplayName } from '../utils/provider-catalog';
import {
  AI_COMMAND_NAMES,
  findCommandSuggestions,
  formatSlashUsage,
  getCommandByName,
  UNIQUE_COMMANDS,
  type CommandEntry,
} from '../utils/command-registry';
import {
  initCommand, modelCommand, planCommand, roadmapCommand, architectCommand, scaffoldCommand,
  debugCommand, emergencyCommand, deployCommand, readmeCommand, launchCommand,
  startupCommand, learnCommand, statusCommand, reviewCommand,
  clearCommand, diffCommand, analyticsCommand, analyzeCommand, buildCommand, autofixCommand, runCommand,
  executeCommand, doctorCommand, explainCommand, summarizeCommand, recoverCommand,
  gitCommand, testGenCommand, profileCommand, checkpointCommand, inspectCommand, replayCommand, graphCommand, memoryCommand, onboardCommand,
  authAddCommand, authListCommand, authTestCommand, authSwitchCommand, authRemoveCommand, authLogoutCommand,
} from './index';
import { showCategorizedReplHelp } from '../utils/help';
import { PromptCancelledError, promptConfirm, promptLine, resetSimplePromptSession } from '../utils/prompt';

type ReplTraceKind = 'system' | 'command' | 'success' | 'warning' | 'error';

const SLASH_COMMANDS = UNIQUE_COMMANDS.map(entry => ({
  cmd: `/${entry.name}`,
  usage: formatSlashUsage(entry),
  desc: entry.description,
}));

const CMD_HANDLERS: Record<string, (...a: any[]) => any> = {
  '/init': initCommand, '/model': modelCommand, '/roadmap': roadmapCommand,
  '/plan': planCommand, '/architect': architectCommand, '/scaffold': scaffoldCommand,
  '/build': buildCommand, '/debug': debugCommand, '/analyze': analyzeCommand,
  '/review': reviewCommand, '/run': runCommand,
  '/diff': diffCommand,
  '/deploy': deployCommand, '/launch': launchCommand, '/startup': startupCommand,
  '/learn': learnCommand, '/readme': readmeCommand, '/emergency': emergencyCommand,
  '/doctor': doctorCommand, '/summarize': summarizeCommand, '/recover': recoverCommand,
  '/autofix': autofixCommand, '/status': statusCommand, '/memory': memoryCommand,
  '/analytics': analyticsCommand, '/graph': graphCommand,
  '/git': gitCommand, '/test': testGenCommand, '/profile': profileCommand,
  '/checkpoint': checkpointCommand, '/sessions': inspectCommand, '/inspect': inspectCommand, '/replay': replayCommand,
  '/auto': executeCommand, '/onboard': onboardCommand,
};

const CT_HANDLERS: Record<string, { fn: (...a: any[]) => any; needsArg: boolean }> = {
  init: { fn: initCommand, needsArg: false }, model: { fn: modelCommand, needsArg: false },
  roadmap: { fn: roadmapCommand, needsArg: false }, plan: { fn: planCommand, needsArg: false },
  architect: { fn: architectCommand, needsArg: false }, scaffold: { fn: scaffoldCommand, needsArg: false },
  build: { fn: buildCommand, needsArg: false }, debug: { fn: debugCommand, needsArg: false },
  analyze: { fn: analyzeCommand, needsArg: false }, review: { fn: reviewCommand, needsArg: false },
  diff: { fn: diffCommand, needsArg: false }, run: { fn: runCommand, needsArg: false },
  deploy: { fn: deployCommand, needsArg: false }, launch: { fn: launchCommand, needsArg: false },
  startup: { fn: startupCommand, needsArg: false }, learn: { fn: learnCommand, needsArg: false },
  readme: { fn: readmeCommand, needsArg: false }, emergency: { fn: emergencyCommand, needsArg: false },
  doctor: { fn: doctorCommand, needsArg: false }, summarize: { fn: summarizeCommand, needsArg: false },
  recover: { fn: recoverCommand, needsArg: false }, autofix: { fn: autofixCommand, needsArg: false },
  status: { fn: statusCommand, needsArg: false }, execute: { fn: executeCommand, needsArg: true },
  auto: { fn: executeCommand, needsArg: true },
  explain: { fn: explainCommand, needsArg: true },
  git: { fn: gitCommand, needsArg: false }, test: { fn: testGenCommand, needsArg: false },
  profile: { fn: profileCommand, needsArg: false }, checkpoint: { fn: checkpointCommand, needsArg: false },
  sessions: { fn: inspectCommand, needsArg: false }, inspect: { fn: inspectCommand, needsArg: false }, replay: { fn: replayCommand, needsArg: false },
  memory: { fn: memoryCommand, needsArg: false }, analytics: { fn: analyticsCommand, needsArg: false }, graph: { fn: graphCommand, needsArg: false },
  onboard: { fn: onboardCommand, needsArg: false },
  auth: { fn: authListCommand, needsArg: false },
};

const ALL_CMDS = SLASH_COMMANDS.map(c => c.cmd);
const AI_REPL_COMMANDS = new Set(Array.from(AI_COMMAND_NAMES).map(name => `/${name}`));

const BOX_W = 56;
const MAX_VISIBLE = 10;
const DEFAULT_PALETTE_ORDER = [
  'execute',
  'inspect',
  'replay',
  'graph',
  'memory',
  'analytics',
  'explain',
  'checkpoint',
  'architect',
  'emergency',
  'summarize',
  'scaffold',
  'roadmap',
  'analyze',
  'autofix',
];
const PALETTE_DESCRIPTIONS: Record<string, string> = {
  execute: 'Autonomous execution agent',
  explain: 'Explain a file',
  checkpoint: 'Recovery points (save, list, restore)',
  inspect: 'Inspect execution journal',
  sessions: 'Session dashboard',
  replay: 'Replay event timeline',
  graph: 'Repository graph view',
  memory: 'Memory explorer',
  analytics: 'Execution analytics',
  architect: 'Design architecture',
  emergency: 'Emergency recovery mode',
  summarize: 'Generate project summary',
  scaffold: 'Scaffold project files',
  roadmap: 'Generate project roadmap',
  analyze: 'Deep codebase analysis',
  autofix: 'Auto-fix build errors',
};

function visibleLen(value: string): number {
  return stripAnsi(value).length;
}

function padStyled(value: string, width: number): string {
  return value + ' '.repeat(Math.max(0, width - visibleLen(value)));
}

function boxWidth(max = 118): number {
  return Math.max(66, Math.min(max, (process.stdout.columns || 92) - 4));
}

function sectionLine(title: string, width: number): string {
  const label = ` ${title} `;
  return chalk.hex(OLED.border)(label + '─'.repeat(Math.max(0, width - visibleLen(label))));
}

function traceIcon(kind: ReplTraceKind): string {
  if (kind === 'success') return chalk.hex(OLED.green)('◆');
  if (kind === 'error') return chalk.hex(OLED.red)('!');
  if (kind === 'warning') return chalk.hex(OLED.yellow)('▲');
  if (kind === 'command') return chalk.hex(OLED.cyan)('>');
  return chalk.hex(OLED.accent)('*');
}

function pushTrace(kind: ReplTraceKind, message: string): void {
  replTrace.push({
    at: new Date().toLocaleTimeString([], { hour12: false }),
    kind,
    message: truncateText(message.replace(/\s+/g, ' ').trim(), 160),
  });
  if (replTrace.length > 10) replTrace = replTrace.slice(-10);
}

function statusPill(label: string, kind: 'ready' | 'warn' | 'idle' | 'hot' = 'idle'): string {
  const color = kind === 'ready' ? OLED.green : kind === 'warn' ? OLED.yellow : kind === 'hot' ? OLED.cyan : OLED.dim;
  return chalk.hex(color).bold(` ${label} `);
}

let inputBuffer = '';
let cursorPos = 0;
let prevCursorRow = 0;
let history: string[] = [];
let historyIdx = 0;
let askMode = false;
let dryRunMode = false;
const customKeys = new KeyBindingManager();
let suggestions: { cmd: string; desc: string; insert?: string }[] = [];
let selectedSuggestion = -1;
let scrollOffset = 0;
let commandInFlight = false;
let suppressNextEmptySubmit = false;
let suppressNextContextLine = false;
let resizeHandlerBound = false;
let keypressEventsBound = false;
let replTrace: Array<{ at: string; kind: ReplTraceKind; message: string }> = [];
let lastSuggestionInput = '';

const promptStr = `${chalk.hex('#dfff72').bold('CodeThon')} ${chalk.hex('#899691')('>')} `;
const promptWidth = stripAnsi(promptStr).length;
const OLED = {
  bg: '#000000',
  panel: '#050807',
  border: '#26332f',
  borderHot: '#74d7ff',
  accent: '#dfff72',
  cyan: '#74d7ff',
  green: '#82f7a6',
  yellow: '#ffcf5c',
  red: '#ff5c7a',
  dim: '#899691',
  text: '#e0e6e1',
  white: '#ffffff',
};

function fuzzyScore(input: string, target: string): number {
  const a = input.toLowerCase();
  const b = target.toLowerCase();
  if (b.startsWith(a)) return 1000 + b.length;
  if (b.includes(a)) return 500 - b.indexOf(a);
  let score = 0, ti = 0;
  for (let ai = 0; ai < a.length && ti < b.length; ai++) {
    while (ti < b.length && b[ti] !== a[ai]) ti++;
    if (ti < b.length) { score += 10; ti++; }
  }
  return score > 0 ? score : 0;
}

function showCommandSuggestions(query: string, slash = true): void {
  suppressNextContextLine = true;
  const isDefaultPalette = slash && (!query.trim() || query.trim() === '/');
  const allMatches = isDefaultPalette
    ? DEFAULT_PALETTE_ORDER
        .map(name => getCommandByName(name))
        .filter((entry): entry is CommandEntry => Boolean(entry))
    : findCommandSuggestions(query);
  const matches = allMatches.slice(0, MAX_VISIBLE);
  if (matches.length === 0) {
    logger.warn(`No commands match ${query}. Try /help.`);
    return;
  }

  const commandText = (entry: CommandEntry) => slash ? formatSlashUsage(entry) : entry.usage;
  const terminalWidth = process.stdout.columns || 80;
  const boxWidth = Math.max(52, terminalWidth - 4);
  const innerWidth = boxWidth - 4;
  const commandWidth = Math.max(20, Math.min(32, Math.floor(innerWidth * 0.34)));
  const descWidth = Math.max(10, innerWidth - commandWidth - 3);

  console.log('');
  console.log(`  ${chalk.hex('#899691')('┌')}${chalk.hex('#899691')('─'.repeat(boxWidth - 2))}${chalk.hex('#899691')('┐')}`);

  for (let index = 0; index < matches.length; index++) {
    const entry = matches[index];
    const selected = index === 0;
    const marker = selected ? chalk.hex('#74d7ff')('>') : ' ';
    const rawCommand = truncateText(commandText(entry), commandWidth);
    const command = rawCommand.padEnd(commandWidth);
    const rawDesc = truncateText(PALETTE_DESCRIPTIONS[entry.name] || entry.description, descWidth);
    const desc = rawDesc.padEnd(descWidth);
    const commandStyled = selected ? chalk.hex('#f7fff9')(command) : chalk.hex('#74d7ff')(command);
    const descStyled = selected ? chalk.hex('#f7fff9')(desc) : chalk.hex('#899691')(desc);
    console.log(`  ${chalk.hex('#899691')('│')} ${marker} ${commandStyled} ${descStyled} ${chalk.hex('#899691')('│')}`);
  }

  console.log(`  ${chalk.hex('#899691')('└')}${chalk.hex('#899691')('─'.repeat(boxWidth - 2))}${chalk.hex('#899691')('┘')}`);
  if (matches.length === MAX_VISIBLE) {
    console.log(`  ${chalk.hex('#899691')('Type more letters to narrow results, or /help for categories.')}`);
  }
  console.log('');
}

function computeSuggestions(): void {
  if (inputBuffer === lastSuggestionInput && suggestions.length > 0) {
    if (selectedSuggestion < scrollOffset) scrollOffset = selectedSuggestion;
    if (selectedSuggestion >= scrollOffset + MAX_VISIBLE) scrollOffset = selectedSuggestion - MAX_VISIBLE + 1;
    if (scrollOffset < 0) scrollOffset = 0;
    if (scrollOffset > Math.max(0, suggestions.length - MAX_VISIBLE)) scrollOffset = Math.max(0, suggestions.length - MAX_VISIBLE);
    return;
  }

  const words = inputBuffer.split(/\s+/);
  const lastWord = words[words.length - 1] || '';

  if (inputBuffer.startsWith('/')) {
    if (words.length === 1 && lastWord === '/') {
      const ordered = [
        ...DEFAULT_PALETTE_ORDER,
        ...UNIQUE_COMMANDS.map(entry => entry.name),
      ];
      suggestions = Array.from(new Set(ordered))
        .map(name => getCommandByName(name))
        .filter((entry): entry is CommandEntry => Boolean(entry))
        .map(entry => ({
          cmd: formatSlashUsage(entry),
          insert: `/${entry.name}`,
          desc: PALETTE_DESCRIPTIONS[entry.name] || entry.description,
          score: 1000,
        }));
    } else {
      const scored = ALL_CMDS
        .map(cmd => {
          const entry = SLASH_COMMANDS.find(s => s.cmd === cmd)!;
          if (words.length === 1) return { cmd, desc: entry.desc, score: fuzzyScore(lastWord, cmd) };
          if (words.length > 1 && cmd.startsWith(lastWord)) return { cmd, desc: entry.desc, score: 1 };
          return { cmd, desc: entry.desc, score: 0 };
        })
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score);
      suggestions = scored;
    }
    if (suggestions.length > 0 && selectedSuggestion < 0) selectedSuggestion = 0;
    if (selectedSuggestion >= suggestions.length) selectedSuggestion = suggestions.length - 1;
  } else {
    suggestions = [];
    selectedSuggestion = -1;
  }

  if (selectedSuggestion < scrollOffset) scrollOffset = selectedSuggestion;
  if (selectedSuggestion >= scrollOffset + MAX_VISIBLE) scrollOffset = selectedSuggestion - MAX_VISIBLE + 1;
  if (scrollOffset < 0) scrollOffset = 0;
  if (scrollOffset > Math.max(0, suggestions.length - MAX_VISIBLE)) scrollOffset = Math.max(0, suggestions.length - MAX_VISIBLE);
  lastSuggestionInput = inputBuffer;
}

// ── Rendering ───────────────────────────────────────────────────
function contextBanner(): void {
  const state = new StateManager();
  const project = state.getProject();
  const llm = getLLMConfig();
  const providerReady = Boolean(llm.apiKey) || llm.provider === 'ollama' || llm.provider === 'local-server';
  const width = boxWidth(122);
  const inner = width - 4;
  const leftW = Math.max(28, Math.floor((inner - 3) * 0.54));
  const rightW = inner - leftW - 3;
  const actions = buildSuggestedActions(llm, project).slice(0, 3).map(action => `/${action.command.split(' ')[0]}`);
  const modeHints = [
    askMode ? statusPill('ask on', 'warn') : statusPill('ask off'),
    dryRunMode ? statusPill('dry-run on', 'warn') : statusPill('dry-run off'),
  ].join(chalk.hex(OLED.border)(' │ '));
  const health = project?.healthScore?.overall ?? 0;
  const healthColor = health >= 80 ? OLED.green : health >= 50 ? OLED.yellow : OLED.red;
  const trace = replTrace.length > 0 ? replTrace.slice(-4) : [
    { at: new Date().toLocaleTimeString([], { hour12: false }), kind: 'system' as ReplTraceKind, message: 'Workspace ready. Type / for commands, Ctrl+K for palette, or ask in plain English.' },
  ];

  console.log('');
  console.log(`  ${chalk.hex(OLED.borderHot)(`╭${'─'.repeat(width - 2)}╮`)}`);
  const title = `${chalk.hex(OLED.accent).bold('CODETHON CLI')} ${chalk.hex(OLED.dim)('·')} ${chalk.hex(OLED.white).bold('OLED Workspace')} ${providerReady ? statusPill('AI READY', 'ready') : statusPill('SETUP NEEDED', 'warn')}`;
  console.log(`  ${chalk.hex(OLED.borderHot)('│')} ${padStyled(title, inner)} ${chalk.hex(OLED.borderHot)('│')}`);
  console.log(`  ${chalk.hex(OLED.borderHot)('├')}${chalk.hex(OLED.border)('─'.repeat(width - 2))}${chalk.hex(OLED.borderHot)('┤')}`);

  const leftRows = [
    `${chalk.hex(OLED.dim)('Project')} ${chalk.hex(OLED.white).bold(project?.name || 'No active project')}`,
    `${chalk.hex(OLED.dim)('Phase')}   ${chalk.hex(OLED.text)(project?.sprintPhase || 'Not started')}`,
    `${chalk.hex(OLED.dim)('Stack')}   ${chalk.hex(OLED.text)(project?.stack || 'Unknown')}`,
    `${chalk.hex(OLED.dim)('Health')}  ${project ? chalk.hex(healthColor).bold(`${health}%`) : chalk.hex(OLED.dim)('N/A')}`,
    `${chalk.hex(OLED.dim)('Mode')}    ${modeHints}`,
  ];
  const rightRows = [
    `${chalk.hex(OLED.dim)('Provider')} ${chalk.hex(OLED.white).bold(getProviderDisplayName(llm.provider))}`,
    `${chalk.hex(OLED.dim)('Model')}    ${chalk.hex(OLED.text)(truncateText(llm.model || 'No model selected', rightW - 10))}`,
    `${chalk.hex(OLED.dim)('Input')}    ${chalk.hex(OLED.cyan).bold('/ command')} ${chalk.hex(OLED.dim)('or plain English')}`,
    `${chalk.hex(OLED.dim)('Palette')}  ${chalk.hex(OLED.cyan).bold('Ctrl+K')}`,
    `${chalk.hex(OLED.dim)('Exit')}     ${chalk.hex(OLED.cyan).bold('/exit')} ${chalk.hex(OLED.dim)('or Ctrl+D')}`,
  ];
  for (let i = 0; i < Math.max(leftRows.length, rightRows.length); i++) {
    const left = padStyled(leftRows[i] || '', leftW);
    const right = padStyled(rightRows[i] || '', rightW);
    console.log(`  ${chalk.hex(OLED.borderHot)('│')} ${left} ${chalk.hex(OLED.border)('│')} ${right} ${chalk.hex(OLED.borderHot)('│')}`);
  }

  console.log(`  ${chalk.hex(OLED.borderHot)('├')}${chalk.hex(OLED.border)('─'.repeat(width - 2))}${chalk.hex(OLED.borderHot)('┤')}`);
  const actionText = `${chalk.hex(OLED.accent).bold('Suggested next actions')} ${chalk.hex(OLED.dim)(actions.length ? actions.join('  ') : '/help  /auth  /plan')}`;
  console.log(`  ${chalk.hex(OLED.borderHot)('│')} ${padStyled(actionText, inner)} ${chalk.hex(OLED.borderHot)('│')}`);
  console.log(`  ${chalk.hex(OLED.borderHot)('├')}${chalk.hex(OLED.border)('─'.repeat(width - 2))}${chalk.hex(OLED.borderHot)('┤')}`);
  const traceTitle = `${chalk.hex(OLED.cyan).bold('Trace')} ${chalk.hex(OLED.dim)('live command activity and system hints')}`;
  console.log(`  ${chalk.hex(OLED.borderHot)('│')} ${padStyled(traceTitle, inner)} ${chalk.hex(OLED.borderHot)('│')}`);
  for (const item of trace) {
    const body = `${traceIcon(item.kind)} ${chalk.hex(OLED.dim)(item.at)} ${chalk.hex(OLED.text)(item.message)}`;
    console.log(`  ${chalk.hex(OLED.borderHot)('│')} ${padStyled(body, inner)} ${chalk.hex(OLED.borderHot)('│')}`);
  }
  console.log(`  ${chalk.hex(OLED.borderHot)(`╰${'─'.repeat(width - 2)}╯`)}`);
}

function pickSuggestion(): { cmd: string; desc: string; insert?: string } | null {
  if (suggestions.length === 0) return null;
  return suggestions[selectedSuggestion >= 0 ? selectedSuggestion : 0] || suggestions[0];
}

function applySuggestion(picked: { cmd: string; insert?: string }, runWhenComplete: boolean): void {
  const insert = picked.insert || picked.cmd;
  const commandName = insert.replace(/^\//, '').split(/\s+/)[0];
  const entry = getCommandByName(commandName);

  inputBuffer = insert;
  cursorPos = inputBuffer.length;
  suggestions = [];
  selectedSuggestion = -1;
  scrollOffset = 0;
  suppressNextEmptySubmit = false;

  if (runWhenComplete && !entry?.requiresArg) {
    void submit();
    return;
  }

  if (entry?.requiresArg && !inputBuffer.endsWith(' ')) {
    inputBuffer += ' ';
    cursorPos = inputBuffer.length;
  }

  renderInput();
}

function printActiveCommand(input: string): void {
  const width = boxWidth(118);
  const clipped = input.length > width - 16 ? `${input.slice(0, width - 17)}…` : input;
  const padded = clipped.padEnd(Math.max(0, width - 12));
  console.log(`  ${chalk.hex(OLED.borderHot)('┌')}${chalk.hex(OLED.borderHot)('─'.repeat(width - 2))}${chalk.hex(OLED.borderHot)('┐')}`);
  console.log(`  ${chalk.hex(OLED.borderHot)('│')} ${chalk.hex(OLED.accent).bold('Running')} ${chalk.hex(OLED.cyan)(padded)}${chalk.hex(OLED.borderHot)('│')}`);
  console.log(`  ${chalk.hex(OLED.borderHot)('└')}${chalk.hex(OLED.borderHot)('─'.repeat(width - 2))}${chalk.hex(OLED.borderHot)('┘')}`);
  console.log('');
}

function compactContextLine(): void {
  const state = new StateManager();
  const project = state.getProject();
  const llm = getLLMConfig();
  const providerReady = Boolean(llm.apiKey) || llm.provider === 'ollama' || llm.provider === 'local-server';
  const actions = buildSuggestedActions(llm, project).slice(0, 2).map(action => `/${action.command.split(' ')[0]}`).join(' ');
  const readiness = providerReady ? chalk.hex(OLED.green).bold('ready') : chalk.hex(OLED.yellow).bold('setup');
  console.log(
    `  ${chalk.hex(OLED.dim)('context')} ${readiness}` +
    `  ${chalk.hex(OLED.dim)('  project')} ${chalk.hex(OLED.white)(project?.name || 'none')}` +
    `  ${chalk.hex(OLED.dim)('  model')} ${chalk.hex(OLED.white)(truncateText(llm.model || 'none', 36))}` +
    `  ${chalk.hex(OLED.dim)('  next')} ${chalk.hex(OLED.cyan)(actions || '/help')}`
  );
}

function shouldUseSimpleRepl(): boolean {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return true;
  if (process.env.CODETHON_SIMPLE_REPL === '1') return true;
  return false;
}

function getSuggestionMetrics(): { boxWidth: number; cmdWidth: number; descWidth: number } {
  const terminalWidth = process.stdout.columns || 80;
  const boxWidth = Math.max(52, terminalWidth - 4);
  const contentWidth = boxWidth - 4;
  const cmdWidth = Math.max(20, Math.min(32, Math.floor(contentWidth * 0.34)));
  const descWidth = Math.max(8, contentWidth - cmdWidth - 3);
  return { boxWidth, cmdWidth, descWidth };
}

function clearRenderArea(): void {
  process.stdout.write('\r');
  if (prevCursorRow > 0) moveCursor(process.stdout, 0, -prevCursorRow);
  clearScreenDown(process.stdout);
}

function detachInputHandlers(): void {
  process.stdin.removeListener('keypress', handleKeypress);
  try { process.stdin.setRawMode(false); } catch {}
}

function attachInputHandlers(): void {
  resetSimplePromptSession();
  if (!keypressEventsBound) {
    (readline as any).emitKeypressEvents(process.stdin);
    process.stdin.setEncoding('utf8');
    keypressEventsBound = true;
  }
  process.stdin.removeListener('keypress', handleKeypress);
  process.stdin.on('keypress', handleKeypress);
  try { process.stdin.setRawMode(true); } catch {}
  process.stdin.resume();
}

function insertTextAtCursor(text: string): void {
  if (!text) return;
  inputBuffer = inputBuffer.slice(0, cursorPos) + text + inputBuffer.slice(cursorPos);
  cursorPos += text.length;
  suppressNextEmptySubmit = false;
  renderInput();
}

function renderInput(): void {
  if (commandInFlight) return;

  computeSuggestions();
  const terminalWidth = process.stdout.columns || 80;
  const inputBoxWidth = boxWidth(122);
  const inputInnerWidth = inputBoxWidth - 4;
  const layout = buildPromptLayout(inputBuffer, cursorPos, inputInnerWidth, promptWidth);
  const inputLines = layout.lines;
  const { boxWidth: sugBoxWidth, cmdWidth, descWidth } = getSuggestionMetrics();
  const visibleSugs = Math.min(suggestions.length, MAX_VISIBLE);
  const suggHeight = suggestions.length > 0 ? visibleSugs + 3 : 0;
  const inputBlockRows = inputLines.length + 2;

  clearRenderArea();

  const border = chalk.hex(OLED.borderHot);
  const borderSoft = chalk.hex(OLED.border);
  process.stdout.write(`  ${border('╭')}${borderSoft('─'.repeat(inputBoxWidth - 2))}${border('╮')}\n`);
  for (let i = 0; i < inputLines.length; i++) {
    const prefix = i === 0 ? promptStr : ' '.repeat(promptWidth);
    const raw = `${prefix}${inputLines[i] ?? ''}`;
    const padded = padStyled(raw, inputInnerWidth);
    process.stdout.write(`  ${border('│')} ${padded} ${border('│')}\n`);
  }
  const hint = suggestions.length > 0
    ? `↑↓ navigate  Tab complete  Enter run  Esc close`
    : `Type / for commands · Ctrl+K palette · Shift+Enter newline`;
  const bottomLabel = ` ${hint} `;
  const bottomFill = Math.max(0, inputBoxWidth - 2 - stripAnsi(bottomLabel).length);
  process.stdout.write(`  ${border('╰')}${chalk.hex(OLED.dim)(bottomLabel)}${borderSoft('─'.repeat(bottomFill))}${border('╯')}\n`);

  if (suggestions.length > 0) {
    const sugBorder = theme.rgb(theme.colors.border);
    process.stdout.write(`  ${sugBorder}\u250C${'\u2500'.repeat(sugBoxWidth - 2)}\u2510${theme.reset()}\n`);

    for (let i = 0; i < visibleSugs; i++) {
      const idx = scrollOffset + i;
      const s = suggestions[idx];
      const selected = idx === selectedSuggestion;
      const prefix = selected ? '\u25B6 ' : '  ';
      const cmdRaw = s.cmd;
      const truncatedCmd = truncateText(cmdRaw, cmdWidth);
      const cmdPadded = truncatedCmd.length >= cmdWidth ? truncatedCmd : truncatedCmd + ' '.repeat(cmdWidth - truncatedCmd.length);
      const cmdStyled = selected
        ? chalk.hex(OLED.white).bold(cmdPadded)
        : chalk.hex(OLED.cyan)(cmdPadded);
      const descMax = Math.max(4, descWidth - (selected ? 1 : 0));
      const descRaw = truncateText(s.desc, descMax);
      const descPadded = descRaw + ' '.repeat(Math.max(0, descWidth - stripAnsi(descRaw).length));
      const descStyled = selected ? chalk.hex(OLED.text)(descPadded) : chalk.hex(OLED.dim)(descPadded);
      const bg = selected ? theme.bgRgb({ r: 16, g: 24, b: 22 }) : '';
      const line = `  ${sugBorder}\u2502${theme.reset()} ${bg}${prefix}${cmdStyled} ${descStyled}${theme.reset()} ${sugBorder}\u2502${theme.reset()}`;
      process.stdout.write(line + '\n');
    }

    const range = `${Math.min(scrollOffset + 1, suggestions.length)}-${Math.min(scrollOffset + visibleSugs, suggestions.length)} of ${suggestions.length}`;
    const footer = ` ${range} · ↑↓ move · Tab complete · Enter run `;
    const footerFill = Math.max(0, sugBoxWidth - 2 - stripAnsi(footer).length);
    process.stdout.write(`  ${sugBorder}\u2502${theme.reset()}${chalk.hex(OLED.dim)(footer)}${chalk.hex(OLED.border)(' '.repeat(footerFill))}${sugBorder}\u2502${theme.reset()}\n`);
    process.stdout.write(`  ${sugBorder}\u2514${'\u2500'.repeat(sugBoxWidth - 2)}\u2518${theme.reset()}\n`);
  }

  const linesUp = inputBlockRows + suggHeight - (1 + layout.cursorRow);
  moveCursor(process.stdout, 0, -linesUp);
  cursorTo(process.stdout, 4 + layout.cursorCol);

  prevCursorRow = 1 + layout.cursorRow;
}

async function ensureReplAiReady(commandLabel: string): Promise<boolean> {
  const { validateProviderConfig } = await import('../utils/config');
  const check = validateProviderConfig();
  if (check.ok) return true;

  logger.warn(`${commandLabel} needs a configured AI provider.`);
  logger.info(check.message);
  logger.info(`  ${chalk.hex('#899691')('Run')} ${chalk.hex('#74d7ff')('/auth add')} ${chalk.hex('#899691')('or')} ${chalk.hex('#74d7ff')('/onboard')} ${chalk.hex('#899691')('to finish setup.')}`);

  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    return false;
  }

  const openSetup = await promptConfirm({
    message: 'Open the guided setup now?',
    defaultValue: true,
  });

  if (!openSetup) return false;

  const result = await onboardCommand(false);
  if (!result.success) return false;

  return validateProviderConfig().ok;
}

async function handleInput(input: string): Promise<void> {
  const trimmed = input.trim();
  if (!trimmed) return;

  const cmd = trimmed.split(/\s+/)[0].toLowerCase();
  const args = trimmed.split(/\s+/).slice(1);

  if (cmd === '/exit' || cmd === '/quit') {
    console.log('');
    logger.info('Goodbye.');
    console.log('');
    process.exit(0);
  }
  if (trimmed === '/') {
    showCommandSuggestions('/');
    return;
  }
  if (trimmed === '/help' || trimmed === '/commands' || trimmed === '/?') { showCategorizedReplHelp(); return; }
  if (trimmed === '/clear') { clearCommand(); return; }

  if (trimmed.startsWith('/')) {
    if (AI_REPL_COMMANDS.has(cmd) && !(await ensureReplAiReady(cmd))) {
      return;
    }
    if (cmd === '/explain') {
      if (!args.length) { logger.warn('Usage: /explain <file>'); return; }
      await explainCommand(args.join(' '));
    } else if (cmd === '/execute' || cmd === '/auto') {
      if (!args.length) { logger.warn(`Usage: ${cmd} <goal>`); return; }
      await executeCommand(args.join(' '), askMode, dryRunMode);
    } else if (cmd === '/build') {
      await buildCommand(args.join(' '), askMode, dryRunMode);
    } else if (cmd === '/autofix') {
      await autofixCommand(askMode, dryRunMode);
    } else if (cmd === '/plan') {
      await planCommand(args.join(' '));
    } else if (cmd === '/run') {
      if (!args.length) { logger.warn('Usage: /run <command>'); return; }
      await runCommand(args, askMode);
    } else if (cmd === '/auth') {
      await handleAuth(args);
    } else {
      const handler = CMD_HANDLERS[cmd];
      if (handler) {
        if (args.length) await handler(...args);
        else await handler();
      } else if (args.length === 0) {
        showCommandSuggestions(cmd);
      } else {
        logger.warn(`Unknown: ${cmd}. Try /help.`);
      }
    }
  } else if (/^ct\s+/i.test(trimmed)) {
    const rest = trimmed.slice(3).trim();
    const rp = rest.split(/\s+/);
    const entry = CT_HANDLERS[rp[0].toLowerCase()];
    if (entry) {
      const ctCommand = rp[0].toLowerCase();
      if (['plan', 'roadmap', 'architect', 'build', 'execute', 'auto', 'debug', 'deploy', 'readme', 'launch', 'startup', 'learn', 'analyze', 'autofix', 'summarize', 'recover', 'explain'].includes(ctCommand)) {
        if (!(await ensureReplAiReady(`ct ${ctCommand}`))) {
          return;
        }
      }
      if (entry.needsArg && !rp.slice(1).length) {
        logger.warn(`Usage: ct ${rp[0]} <argument>`);
        return;
      }
      const subCmd = ctCommand;
      if (subCmd === 'build') await buildCommand(rp.slice(1).join(' '), askMode, dryRunMode);
      else if (subCmd === 'autofix') await autofixCommand(askMode, dryRunMode);
      else if (subCmd === 'execute' || subCmd === 'auto') await executeCommand(rp.slice(1).join(' '), askMode, dryRunMode);
      else if (subCmd === 'run') await runCommand(rp.slice(1), askMode);
      else if (subCmd === 'auth') await handleAuth(rp.slice(1));
      else await entry.fn(...rp.slice(1));
    } else {
      if (!(await ensureReplAiReady('AI request'))) {
        return;
      }
      await naturalLanguageCommand(rest);
    }
  } else {
    const entry = getCommandByName(cmd);
    if (entry) {
      if (AI_COMMAND_NAMES.has(entry.name) && !(await ensureReplAiReady(entry.name))) {
        return;
      }
      if (entry.requiresArg && !args.length) {
        logger.warn(`Usage: ${entry.usage}`);
        return;
      }

      if (entry.name === 'help') {
        showCategorizedReplHelp();
      } else if (entry.name === 'clear') {
        clearCommand();
      } else if (entry.name === 'exit') {
        console.log('');
        logger.info('Goodbye.');
        console.log('');
        process.exit(0);
      } else if (entry.name === 'build') {
        await buildCommand(args.join(' '), askMode, dryRunMode);
      } else if (entry.name === 'autofix') {
        await autofixCommand(askMode, dryRunMode);
      } else if (entry.name === 'execute' || entry.name === 'auto') {
        await executeCommand(args.join(' '), askMode, dryRunMode);
      } else if (entry.name === 'run') {
        if (!args.length) { logger.warn('Usage: run <command>'); return; }
        await runCommand(args, askMode);
      } else if (entry.name === 'auth') {
        await handleAuth(args);
      } else {
        const handler = CT_HANDLERS[entry.name];
        if (handler) await handler.fn(...args);
      }
      return;
    }

    if (args.length === 0) {
      const matches = findCommandSuggestions(trimmed);
      if (matches.length > 0) {
        showCommandSuggestions(trimmed, false);
        return;
      }
    }

    if (!(await ensureReplAiReady('AI request'))) {
      return;
    }
    await naturalLanguageCommand(trimmed);
  }
}

async function simpleReplLoop(): Promise<void> {
  try { process.stdin.setRawMode(false); } catch {}
  let printedBanner = false;
  let lastSetupWarning = '';

  while (true) {
    if (!printedBanner) {
      console.log('');
      contextBanner();
      console.log('');
      printedBanner = true;
    } else if (suppressNextContextLine) {
      suppressNextContextLine = false;
    } else {
      compactContextLine();
    }

    const { validateProviderConfig } = await import('../utils/config');
    const check = validateProviderConfig();
    if (!check.ok && check.message !== lastSetupWarning) {
      logger.warn(check.message.replace('No API key', 'No API key configured'));
      pushTrace('warning', 'AI provider setup is incomplete. Run /auth add or /onboard.');
      console.log('');
      lastSetupWarning = check.message;
    }

    let answer = '';
    try {
      answer = await promptLine(`${promptStr}`);
    } catch (error) {
      if (error instanceof PromptCancelledError) {
        console.log('');
        logger.info('Goodbye.');
        console.log('');
        return;
      }
      throw error;
    }

    const trimmed = answer.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed === '/exit' || trimmed === '/quit') {
      console.log('');
      logger.info('Goodbye.');
      console.log('');
      return;
    }

    try {
      await handleInput(trimmed);
    } catch (e: any) {
      if (e instanceof PromptCancelledError) {
        logger.warn('Cancelled.');
      } else {
        const { formatApiError } = await import('../utils/api-error');
        logger.error(formatApiError(e));
      }
    }
  }
}

async function handleAuth(args: string[]): Promise<void> {
  const sub = args[0]?.toLowerCase();
  if (!sub || sub === 'list') {
    await authListCommand();
  } else if (sub === 'add') {
    await authAddCommand();
  } else if (sub === 'test') {
    await authTestCommand(args[1]);
  } else if (sub === 'switch') {
    await authSwitchCommand();
  } else if (sub === 'remove') {
    await authRemoveCommand(args[1]);
  } else if (sub === 'logout') {
    await authLogoutCommand();
  } else {
    logger.warn(`Unknown auth subcommand: ${sub}. Try: add, list, test, switch, remove, logout`);
  }
}

async function submit(): Promise<void> {
  if (commandInFlight) return;

  const input = inputBuffer;

  clearRenderArea();

  suggestions = [];
  selectedSuggestion = -1;
  scrollOffset = 0;
  inputBuffer = '';
  cursorPos = 0;
  lastSuggestionInput = '';
  prevCursorRow = 0;

  console.log('');

  const trimmed = input.trim();
  if (trimmed) {
    history.push(trimmed);
    if (history.length > 200) history = history.slice(-200);
    historyIdx = 0;
  }

  if (trimmed) {
    commandInFlight = true;
    detachInputHandlers();
    const startedAt = Date.now();
    pushTrace('command', trimmed);
    try {
      if (trimmed !== '/' && !trimmed.startsWith('/help') && !trimmed.startsWith('/commands') && !trimmed.startsWith('/?')) {
        printActiveCommand(trimmed);
      }
      await handleInput(trimmed);
      pushTrace('success', `${trimmed} completed in ${Date.now() - startedAt}ms`);
    } catch (e: any) {
      if (e instanceof PromptCancelledError) {
        logger.warn('Cancelled.');
        pushTrace('warning', `${trimmed} cancelled`);
      } else {
        const { formatApiError } = await import('../utils/api-error');
        logger.error(formatApiError(e));
        pushTrace('error', `${trimmed} failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    } finally {
      commandInFlight = false;
      attachInputHandlers();
      suppressNextEmptySubmit = true;
    }
  }

  if (suppressNextContextLine) {
    suppressNextContextLine = false;
    prevCursorRow = 0;
    renderInput();
    return;
  }

  prevCursorRow = 0;
  renderInput();
}

function handleKeypress(str: string, key: any): void {
  if (!key) key = {};

  if (key.ctrl && key.name === 'c') {
    clearRenderArea();
    inputBuffer = '';
    cursorPos = 0;
    suggestions = [];
    selectedSuggestion = -1;
    scrollOffset = 0;
    prevCursorRow = 0;
    process.stdout.write('^C\n');
    renderInput();
    return;
  }

  if (key.ctrl && key.name === 'k') {
    inputBuffer = '/';
    cursorPos = inputBuffer.length;
    suggestions = [];
    selectedSuggestion = -1;
    scrollOffset = 0;
    suppressNextEmptySubmit = false;
    renderInput();
    return;
  }

  if (key.ctrl && key.name === 'd') {
    if (inputBuffer.length === 0) {
      console.log('');
      logger.info('Goodbye.');
      process.exit(0);
    }
    return;
  }

  if (key.name === 'return' && !key.shift) {
    if (suppressNextEmptySubmit && inputBuffer.trim() === '') {
      suppressNextEmptySubmit = false;
      return;
    }
    const picked = pickSuggestion();
    const inputIsOnlyCommandFragment = inputBuffer.trim().startsWith('/') && !inputBuffer.trim().includes(' ');
    if (picked && inputIsOnlyCommandFragment && inputBuffer.trim() !== (picked.insert || picked.cmd)) {
      suppressNextEmptySubmit = false;
      applySuggestion(picked, true);
      return;
    }
    suppressNextEmptySubmit = false;
    void submit();
    return;
  }

  if (key.name === 'return' && key.shift) {
    inputBuffer = inputBuffer.slice(0, cursorPos) + '\n' + inputBuffer.slice(cursorPos);
    cursorPos++;
    renderInput();
    return;
  }

  if (key.name === 'backspace') {
    suppressNextEmptySubmit = false;
    if (cursorPos > 0) {
      inputBuffer = inputBuffer.slice(0, cursorPos - 1) + inputBuffer.slice(cursorPos);
      cursorPos--;
      renderInput();
    }
    return;
  }

  if (key.name === 'delete') {
    suppressNextEmptySubmit = false;
    if (cursorPos < inputBuffer.length) {
      inputBuffer = inputBuffer.slice(0, cursorPos) + inputBuffer.slice(cursorPos + 1);
      renderInput();
    }
    return;
  }

  if (key.name === 'left') {
    if (cursorPos > 0) { cursorPos--; renderInput(); }
    return;
  }

  if (key.name === 'right') {
    if (cursorPos < inputBuffer.length) { cursorPos++; renderInput(); }
    return;
  }

  if (key.name === 'home') {
    cursorPos = 0;
    renderInput();
    return;
  }

  if (key.name === 'end') {
    cursorPos = inputBuffer.length;
    renderInput();
    return;
  }

  if (key.name === 'tab') {
    const picked = pickSuggestion();
    if (picked) {
      const words = inputBuffer.split(/\s+/);
      const lastWord = words[words.length - 1] || '';
      const prefix = inputBuffer.slice(0, inputBuffer.length - lastWord.length);
      inputBuffer = prefix + (picked.insert || picked.cmd) + ' ';
      cursorPos = inputBuffer.length;
      suggestions = [];
      selectedSuggestion = -1;
      scrollOffset = 0;
      suppressNextEmptySubmit = false;
      renderInput();
    } else {
      const words = inputBuffer.split(/\s+/);
      const lastWord = words[words.length - 1] || '';
      const matches = ALL_CMDS.filter(c => c.toLowerCase().startsWith(lastWord.toLowerCase()) && c.length > lastWord.length);
          if (matches.length === 1) {
            const prefix = inputBuffer.slice(0, inputBuffer.length - lastWord.length);
            inputBuffer = prefix + matches[0] + ' ';
            cursorPos = inputBuffer.length;
            suppressNextEmptySubmit = false;
            renderInput();
          }
    }
    return;
  }

  if (key.name === 'escape') {
    suggestions = [];
    selectedSuggestion = -1;
    scrollOffset = 0;
    renderInput();
    return;
  }

  // ── Up / Down: navigate suggestions or history ──
  if (key.name === 'up') {
    if (suggestions.length > 0) {
      if (selectedSuggestion <= 0) selectedSuggestion = suggestions.length - 1;
      else selectedSuggestion--;

      // Auto-scroll: if selected goes above visible window, scroll up
      if (selectedSuggestion < scrollOffset) scrollOffset = selectedSuggestion;
      if (selectedSuggestion >= scrollOffset + MAX_VISIBLE) scrollOffset = selectedSuggestion - MAX_VISIBLE + 1;
      if (scrollOffset < 0) scrollOffset = 0;

      renderInput();
    } else if (history.length > 0 && historyIdx < history.length) {
      historyIdx++;
      inputBuffer = history[history.length - historyIdx];
      cursorPos = inputBuffer.length;
      suppressNextEmptySubmit = false;
      renderInput();
    }
    return;
  }

  if (key.name === 'down') {
    if (suggestions.length > 0) {
      if (selectedSuggestion < 0) selectedSuggestion = 0;
      else selectedSuggestion = (selectedSuggestion + 1) % suggestions.length;

      // Auto-scroll: if selected goes below visible window, scroll down
      if (selectedSuggestion >= scrollOffset + MAX_VISIBLE) scrollOffset = selectedSuggestion - MAX_VISIBLE + 1;
      if (selectedSuggestion < scrollOffset) scrollOffset = selectedSuggestion;
      if (scrollOffset < 0) scrollOffset = 0;

      renderInput();
    } else if (historyIdx > 0) {
      historyIdx--;
      inputBuffer = historyIdx === 0 ? '' : history[history.length - historyIdx];
      cursorPos = inputBuffer.length;
      suppressNextEmptySubmit = false;
      renderInput();
    }
    return;
  }

  if (key.ctrl && key.name === 'l') {
    process.stdout.write('\x1bc');
    console.log('');
    contextBanner();
    console.log('');
    prevCursorRow = 0;
    renderInput();
    return;
  }

  if (str && str.length === 1) {
    // Check custom keybindings first so control characters don't get inserted as text
    const customHandler = customKeys.lookup(key.name || '', !!key.ctrl, !!key.shift);
    if (customHandler) {
      customHandler();
      renderInput();
      return;
    }
    // Ignore control characters that aren't bound
    if (key.ctrl) return;
    insertTextAtCursor(str);
    return;
  }

  if (str && str.length > 1) {
    const customHandler = customKeys.lookup(key.name || '', !!key.ctrl, !!key.shift);
    if (customHandler) {
      customHandler();
      renderInput();
      return;
    }
    if (key.ctrl) return;

    const normalized = str
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');

    if (!normalized) return;
    insertTextAtCursor(normalized);
    return;
  }
}

export async function replCommand(ask = false, dryRun = false): Promise<void> {
  askMode = ask;
  dryRunMode = dryRun;
  theme.setMode(getThemeMode());
  if (replTrace.length === 0) {
    pushTrace('system', 'OLED workspace started. Type / for commands or ask in plain English.');
    pushTrace('system', 'Use Ctrl+K for palette, Tab to complete, ↑↓ for history and suggestions.');
  }

  if (shouldUseSimpleRepl()) {
    await simpleReplLoop();
    return;
  }

  contextBanner();
  console.log('');

  const { validateProviderConfig } = await import('../utils/config');
  const check = validateProviderConfig();
  if (!check.ok) {
    logger.warn(check.message.replace('No API key', 'No API key configured'));
    pushTrace('warning', 'AI provider setup needed before AI commands can run.');
    console.log('');
  }

  inputBuffer = '';
  cursorPos = 0;
  prevCursorRow = 0;
  historyIdx = 0;
  suggestions = [];
  selectedSuggestion = -1;
  scrollOffset = 0;

  // Register custom keybindings
  customKeys.register('ctrl+p', () => {
    theme.toggle();
    setThemeMode(theme.isDark() ? 'dark' : 'light');
    logger.info(`Theme: ${theme.isDark() ? 'dark' : 'light'}`);
    pushTrace('system', `Theme switched to ${theme.isDark() ? 'OLED dark' : 'light'}`);
  });

  if (!resizeHandlerBound) {
    process.stdout.on('resize', () => {
      if (commandInFlight) return;
      process.stdout.write('\x1bc');
      console.log('');
      contextBanner();
      console.log('');
      prevCursorRow = 0;
      renderInput();
    });
    resizeHandlerBound = true;
  }

  attachInputHandlers();
  renderInput();
}
