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
  clearCommand, analyzeCommand, buildCommand, autofixCommand, runCommand,
  executeCommand, doctorCommand, explainCommand, summarizeCommand, recoverCommand,
  gitCommand, testGenCommand, profileCommand, checkpointCommand, onboardCommand,
  authAddCommand, authListCommand, authTestCommand, authSwitchCommand, authRemoveCommand, authLogoutCommand,
} from './index';
import { showCategorizedReplHelp } from '../utils/help';
import { PromptCancelledError, promptConfirm, promptLine, resetSimplePromptSession } from '../utils/prompt';

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
  '/diff': () => gitCommand('diff'),
  '/deploy': deployCommand, '/launch': launchCommand, '/startup': startupCommand,
  '/learn': learnCommand, '/readme': readmeCommand, '/emergency': emergencyCommand,
  '/doctor': doctorCommand, '/summarize': summarizeCommand, '/recover': recoverCommand,
  '/autofix': autofixCommand, '/status': statusCommand,
  '/git': gitCommand, '/test': testGenCommand, '/profile': profileCommand,
  '/checkpoint': checkpointCommand, '/onboard': onboardCommand,
};

const CT_HANDLERS: Record<string, { fn: (...a: any[]) => any; needsArg: boolean }> = {
  init: { fn: initCommand, needsArg: false }, model: { fn: modelCommand, needsArg: false },
  roadmap: { fn: roadmapCommand, needsArg: false }, plan: { fn: planCommand, needsArg: false },
  architect: { fn: architectCommand, needsArg: false }, scaffold: { fn: scaffoldCommand, needsArg: false },
  build: { fn: buildCommand, needsArg: false }, debug: { fn: debugCommand, needsArg: false },
  analyze: { fn: analyzeCommand, needsArg: false }, review: { fn: reviewCommand, needsArg: false },
  diff: { fn: () => gitCommand('diff'), needsArg: false }, run: { fn: runCommand, needsArg: false },
  deploy: { fn: deployCommand, needsArg: false }, launch: { fn: launchCommand, needsArg: false },
  startup: { fn: startupCommand, needsArg: false }, learn: { fn: learnCommand, needsArg: false },
  readme: { fn: readmeCommand, needsArg: false }, emergency: { fn: emergencyCommand, needsArg: false },
  doctor: { fn: doctorCommand, needsArg: false }, summarize: { fn: summarizeCommand, needsArg: false },
  recover: { fn: recoverCommand, needsArg: false }, autofix: { fn: autofixCommand, needsArg: false },
  status: { fn: statusCommand, needsArg: false }, execute: { fn: executeCommand, needsArg: true },
  explain: { fn: explainCommand, needsArg: true },
  git: { fn: gitCommand, needsArg: false }, test: { fn: testGenCommand, needsArg: false },
  profile: { fn: profileCommand, needsArg: false }, checkpoint: { fn: checkpointCommand, needsArg: false },
  onboard: { fn: onboardCommand, needsArg: false },
  auth: { fn: authListCommand, needsArg: false },
};

const ALL_CMDS = SLASH_COMMANDS.map(c => c.cmd);
const AI_REPL_COMMANDS = new Set(Array.from(AI_COMMAND_NAMES).map(name => `/${name}`));

const BOX_W = 56;
const MAX_VISIBLE = 10;
const DEFAULT_PALETTE_ORDER = [
  'execute',
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
  architect: 'Design architecture',
  emergency: 'Emergency recovery mode',
  summarize: 'Generate project summary',
  scaffold: 'Scaffold project files',
  roadmap: 'Generate project roadmap',
  analyze: 'Deep codebase analysis',
  autofix: 'Auto-fix build errors',
};

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

const promptStr = chalk.cyanBright(`${chalk.bold.magentaBright('CodeThon')} ${chalk.dim('>')} `);
const promptWidth = stripAnsi(promptStr).length;

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
  console.log(`  ${chalk.dim('┌')}${chalk.dim('─'.repeat(boxWidth - 2))}${chalk.dim('┐')}`);

  for (let index = 0; index < matches.length; index++) {
    const entry = matches[index];
    const selected = index === 0;
    const marker = selected ? chalk.cyanBright('▶') : ' ';
    const rawCommand = truncateText(commandText(entry), commandWidth);
    const command = rawCommand.padEnd(commandWidth);
    const rawDesc = truncateText(PALETTE_DESCRIPTIONS[entry.name] || entry.description, descWidth);
    const desc = rawDesc.padEnd(descWidth);
    const commandStyled = selected ? chalk.whiteBright(command) : chalk.cyanBright(command);
    const descStyled = selected ? chalk.whiteBright(desc) : chalk.dim(desc);
    console.log(`  ${chalk.dim('│')} ${marker} ${commandStyled} ${descStyled} ${chalk.dim('│')}`);
  }

  console.log(`  ${chalk.dim('└')}${chalk.dim('─'.repeat(boxWidth - 2))}${chalk.dim('┘')}`);
  if (matches.length === MAX_VISIBLE) {
    console.log(`  ${chalk.dim('Type more letters to narrow results, or /help for categories.')}`);
  }
  console.log('');
}

function computeSuggestions(): void {
  const words = inputBuffer.split(/\s+/);
  const lastWord = words[words.length - 1] || '';

  if (inputBuffer.startsWith('/')) {
    if (words.length === 1 && lastWord === '/') {
      suggestions = DEFAULT_PALETTE_ORDER
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
}

// ── Rendering ───────────────────────────────────────────────────
function contextBanner(): void {
  const state = new StateManager();
  const project = state.getProject();
  const llm = getLLMConfig();
  const providerReady = Boolean(llm.apiKey) || llm.provider === 'ollama' || llm.provider === 'local-server';
  const width = Math.min(110, Math.max(60, (process.stdout.columns || 80) - 6));
  const line = chalk.dim('\u2500'.repeat(width));
  const actions = buildSuggestedActions(llm, project).slice(0, 2).map(action => `/${action.command.split(' ')[0]}`).join('  ');
  const modeHints = [
    askMode ? chalk.yellowBright('ask on') : chalk.dim('ask off'),
    dryRunMode ? chalk.yellowBright('dry-run on') : chalk.dim('dry-run off'),
  ].join('  ');

  console.log(`  ${chalk.dim(line)}`);
  console.log(`  ${chalk.bold.magentaBright('CodeThon')} ${chalk.dim('interactive mode')}  ${providerReady ? chalk.greenBright('AI ready') : chalk.yellowBright('setup needed')}`);
  console.log(`  ${chalk.dim('Project:')} ${chalk.whiteBright(project?.name || 'No active project')}  ${chalk.dim('Phase:')} ${chalk.whiteBright(project?.sprintPhase || 'Not started')}`);
  if (project?.healthScore) {
    const h = project.healthScore.overall;
    const c = h >= 80 ? chalk.greenBright : h >= 50 ? chalk.yellowBright : chalk.redBright;
    console.log(`  ${chalk.dim('Health:')} ${c(`${h}%`)}  ${chalk.dim('Stack:')} ${chalk.whiteBright(project.stack || 'Unknown')}`);
  }
  console.log(`  ${chalk.dim('AI:')} ${chalk.whiteBright(`${getProviderDisplayName(llm.provider)} · ${llm.model || 'No model selected'}`)}`);
  console.log(`  ${chalk.dim('Mode:')} ${modeHints}`);
  console.log(`  ${chalk.dim('Next:')} ${chalk.cyanBright(actions || '/help  /auth  /plan')}`);
  console.log(`  ${chalk.dim(line)}`);
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
  const width = Math.max(60, Math.min(110, (process.stdout.columns || 88) - 4));
  const clipped = input.length > width - 16 ? `${input.slice(0, width - 17)}…` : input;
  const padded = clipped.padEnd(Math.max(0, width - 12));
  console.log(`  ${chalk.cyan('┌')}${chalk.cyan('─'.repeat(width - 2))}${chalk.cyan('┐')}`);
  console.log(`  ${chalk.cyan('│')} ${chalk.bold.whiteBright('Running')} ${chalk.cyanBright(padded)}${chalk.cyan('│')}`);
  console.log(`  ${chalk.cyan('└')}${chalk.cyan('─'.repeat(width - 2))}${chalk.cyan('┘')}`);
  console.log('');
}

function compactContextLine(): void {
  const state = new StateManager();
  const project = state.getProject();
  const llm = getLLMConfig();
  const providerReady = Boolean(llm.apiKey) || llm.provider === 'ollama' || llm.provider === 'local-server';
  const actions = buildSuggestedActions(llm, project).slice(0, 2).map(action => `/${action.command.split(' ')[0]}`).join(' ');
  const readiness = providerReady ? chalk.greenBright('ready') : chalk.yellowBright('setup');
  console.log(
    `  ${chalk.dim('context')} ${readiness}` +
    `  ${chalk.dim('project')} ${chalk.whiteBright(project?.name || 'none')}` +
    `  ${chalk.dim('model')} ${chalk.whiteBright(llm.model || 'none')}` +
    `  ${chalk.dim('next')} ${chalk.cyanBright(actions || '/help')}`
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
  const layout = buildPromptLayout(inputBuffer, cursorPos, terminalWidth, promptWidth);
  const inputLines = layout.lines;
  const { boxWidth, cmdWidth, descWidth } = getSuggestionMetrics();
  const visibleSugs = Math.min(suggestions.length, MAX_VISIBLE);
  const suggHeight = suggestions.length > 0 ? visibleSugs + 2 : 0;

  clearRenderArea();

  process.stdout.write(`${promptStr}${inputLines[0] ?? ''}\n`);
  for (let i = 1; i < inputLines.length; i++) {
    process.stdout.write(`${inputLines[i]}\n`);
  }

  if (suggestions.length > 0) {
    const border = theme.rgb(theme.colors.border);
    process.stdout.write(`  ${border}\u250C${'\u2500'.repeat(boxWidth - 2)}\u2510${theme.reset()}\n`);

    for (let i = 0; i < visibleSugs; i++) {
      const idx = scrollOffset + i;
      const s = suggestions[idx];
      const selected = idx === selectedSuggestion;
      const prefix = selected ? '\u25B6 ' : '  ';
      const cmdRaw = s.cmd;
      const truncatedCmd = truncateText(cmdRaw, cmdWidth);
      const cmdPadded = truncatedCmd.length >= cmdWidth ? truncatedCmd : truncatedCmd + ' '.repeat(cmdWidth - truncatedCmd.length);
      const cmdStyled = selected
        ? theme.rgb(theme.colors.textBright) + cmdPadded + theme.reset()
        : theme.style(cmdPadded, 'primary');
      const descMax = Math.max(4, descWidth - (selected ? 1 : 0));
      const descRaw = truncateText(s.desc, descMax);
      const descPadded = descRaw + ' '.repeat(Math.max(0, descWidth - stripAnsi(descRaw).length));
      const descStyled = theme.style(descPadded, 'textDim');
      const bg = selected ? theme.bgRgb({ r: 40, g: 40, b: 50 }) : '';
      const line = `  ${border}\u2502${theme.reset()} ${bg}${prefix}${cmdStyled} ${descStyled}${theme.reset()} ${border}\u2502${theme.reset()}`;
      process.stdout.write(line + '\n');
    }

    process.stdout.write(`  ${border}\u2514${'\u2500'.repeat(boxWidth - 2)}\u2518${theme.reset()}\n`);
  }

  const linesUp = inputLines.length + suggHeight - layout.cursorRow;
  moveCursor(process.stdout, 0, -linesUp);
  cursorTo(process.stdout, layout.cursorCol);

  prevCursorRow = layout.cursorRow;
}

async function ensureReplAiReady(commandLabel: string): Promise<boolean> {
  const { validateProviderConfig } = await import('../utils/config');
  const check = validateProviderConfig();
  if (check.ok) return true;

  logger.warn(`${commandLabel} needs a configured AI provider.`);
  logger.info(check.message);
  logger.info(`  ${chalk.dim('Run')} ${chalk.cyanBright('/auth add')} ${chalk.dim('or')} ${chalk.cyanBright('/onboard')} ${chalk.dim('to finish setup.')}`);

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
    } else if (cmd === '/execute') {
      if (!args.length) { logger.warn('Usage: /execute <goal>'); return; }
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
      if (['plan', 'roadmap', 'architect', 'build', 'execute', 'debug', 'deploy', 'readme', 'launch', 'startup', 'learn', 'analyze', 'autofix', 'summarize', 'recover', 'explain'].includes(ctCommand)) {
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
      else if (subCmd === 'execute') await executeCommand(rp.slice(1).join(' '), askMode, dryRunMode);
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
      } else if (entry.name === 'execute') {
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
    try {
      if (trimmed !== '/' && !trimmed.startsWith('/help') && !trimmed.startsWith('/commands') && !trimmed.startsWith('/?')) {
        printActiveCommand(trimmed);
      }
      await handleInput(trimmed);
    } catch (e: any) {
      if (e instanceof PromptCancelledError) {
        logger.warn('Cancelled.');
      } else {
        const { formatApiError } = await import('../utils/api-error');
        logger.error(formatApiError(e));
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

  contextBanner();
  console.log('');
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
  logger.highlight('  Type /help for commands, or just ask anything.');
  console.log('');

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
