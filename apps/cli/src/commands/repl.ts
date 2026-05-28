import readline from 'readline';
import chalk from 'chalk';
import { cursorTo, moveCursor, clearScreenDown } from 'readline';
import { StateManager } from '../cil/state-manager';
import { getLLMConfig } from '../utils/config';
import { logger } from '../utils';
import { naturalLanguageCommand } from './nl';
import { theme } from '../ui/theme';
import { KeyBindingManager } from '../ui/keybindings';
import {
  initCommand, modelCommand, planCommand, roadmapCommand, architectCommand, scaffoldCommand,
  debugCommand, emergencyCommand, deployCommand, readmeCommand, launchCommand,
  startupCommand, learnCommand, statusCommand, reviewCommand, diffCommand,
  clearCommand, analyzeCommand, buildCommand, autofixCommand, runCommand,
  executeCommand, doctorCommand, explainCommand, summarizeCommand, recoverCommand,
  gitCommand, testGenCommand, profileCommand, checkpointCommand, onboardCommand,
} from './index';
import { showCategorizedReplHelp } from '../utils/help';

const SLASH_COMMANDS = [
  { cmd: '/init', desc: 'Initialize a new project' },
  { cmd: '/model', desc: 'Switch AI model' },
  { cmd: '/roadmap', desc: 'Generate project roadmap' },
  { cmd: '/plan', desc: 'Generate architecture plan' },
  { cmd: '/architect', desc: 'Design architecture' },
  { cmd: '/scaffold', desc: 'Scaffold project files' },
  { cmd: '/build', desc: 'Build and auto-fix the project' },
  { cmd: '/debug', desc: 'Debug build errors' },
  { cmd: '/analyze', desc: 'Deep codebase analysis' },
  { cmd: '/explain <file>', desc: 'Explain a file' },
  { cmd: '/review', desc: 'Review current changes' },
  { cmd: '/diff', desc: 'Show full diff' },
  { cmd: '/run', desc: 'Run scripts without agent' },
  { cmd: '/execute <goal>', desc: 'Autonomous execution agent' },
  { cmd: '/deploy', desc: 'Deploy the project' },
  { cmd: '/launch', desc: 'Generate launch assets' },
  { cmd: '/startup', desc: 'Startup analysis' },
  { cmd: '/learn', desc: 'Learn a new concept' },
  { cmd: '/readme', desc: 'Generate README' },
  { cmd: '/emergency', desc: 'Emergency recovery mode' },
  { cmd: '/doctor', desc: 'Run project diagnostics' },
  { cmd: '/summarize', desc: 'Generate project summary' },
  { cmd: '/recover', desc: 'Scan and recover project state' },
  { cmd: '/autofix', desc: 'Auto-fix build errors' },
  { cmd: '/status', desc: 'Show project status & health' },
  { cmd: '/clear', desc: 'Clear terminal' },
  { cmd: '/git', desc: 'Git integration (status, diff, commit, review, PR)' },
  { cmd: '/test', desc: 'Test agent (generate, coverage, mutate)' },
  { cmd: '/profile', desc: 'Profile code for perf issues & smells' },
  { cmd: '/checkpoint', desc: 'Recovery points (save, list, restore)' },
  { cmd: '/onboard', desc: 'First-time setup wizard' },
  { cmd: '/help', desc: 'Show available commands' },
  { cmd: '/exit', desc: 'Exit REPL' },
  { cmd: '/quit', desc: 'Exit REPL' },
];

const CMD_HANDLERS: Record<string, (...a: any[]) => any> = {
  '/init': initCommand, '/model': modelCommand, '/roadmap': roadmapCommand,
  '/plan': planCommand, '/architect': architectCommand, '/scaffold': scaffoldCommand,
  '/build': buildCommand, '/debug': debugCommand, '/analyze': analyzeCommand,
  '/review': reviewCommand, '/diff': diffCommand, '/run': runCommand,
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
  diff: { fn: diffCommand, needsArg: false }, run: { fn: runCommand, needsArg: false },
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
};

const INQUIRER_CMDS = new Set(['/init', '/model', '/debug', '/deploy', '/emergency', '/learn']);
const INQUIRER_CT = new Set(['init', 'model', 'debug', 'deploy', 'emergency', 'learn']);

const ALL_CMDS = SLASH_COMMANDS.map(c => c.cmd);

const BOX_W = 56;
const CONTENT_W = BOX_W - 4;
const CMD_W = 18;
const DESC_W = CONTENT_W - CMD_W - 1;
const MAX_VISIBLE = 10;

let inputBuffer = '';
let cursorPos = 0;
let prevCursorLine = 0;
let history: string[] = [];
let historyIdx = 0;
let askMode = false;
let dryRunMode = false;
const customKeys = new KeyBindingManager();
let suggestions: { cmd: string; desc: string }[] = [];
let selectedSuggestion = -1;
let scrollOffset = 0;

const promptStr = chalk.cyanBright(`${chalk.bold.magentaBright('CodeThon')} ${chalk.dim('>')} `);
const promptWidth = stripAnsi(promptStr).length;

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

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

function computeSuggestions(): void {
  const words = inputBuffer.split(/\s+/);
  const lastWord = words[words.length - 1] || '';

  if (inputBuffer.startsWith('/') && words.length === 1 && lastWord.length >= 1) {
    const scored = ALL_CMDS
      .map(cmd => {
        const entry = SLASH_COMMANDS.find(s => s.cmd === cmd)!;
        return { cmd, desc: entry.desc, score: fuzzyScore(lastWord, cmd) };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);
    suggestions = scored;
    if (selectedSuggestion >= suggestions.length) selectedSuggestion = suggestions.length - 1;
    if (selectedSuggestion < 0 && suggestions.length > 0) selectedSuggestion = 0;
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
  const width = 56;
  const line = chalk.dim('\u2500'.repeat(width));

  console.log(`  ${chalk.dim(line)}`);
  if (project) {
    console.log(`  ${chalk.dim('Project:')} ${chalk.whiteBright(project.name)}`);
    console.log(`  ${chalk.dim('Stack:')}   ${chalk.whiteBright(project.stack)}`);
    let healthStr = '';
    if (project.healthScore) {
      const h = project.healthScore.overall;
      const c = h >= 80 ? chalk.greenBright : h >= 50 ? chalk.yellowBright : chalk.red;
      healthStr = c(`${h}%`);
    }
    const phaseLabel = `${chalk.dim('Phase:')}  ${chalk.whiteBright(project.sprintPhase)}`;
    if (healthStr) {
      const healthLabel = `${chalk.dim('Health:')} ${healthStr}`;
      const pad = width - stripAnsi(phaseLabel).length - stripAnsi(healthLabel).length;
      console.log(`  ${phaseLabel}${' '.repeat(Math.max(1, pad))}${healthLabel}`);
    } else {
      console.log(`  ${phaseLabel}`);
    }
  }
  console.log(`  ${chalk.dim('Model:')}  ${chalk.whiteBright(llm.model || 'not set')}`);
  console.log(`  ${chalk.dim(line)}`);
}

function renderInput(): void {
  computeSuggestions();
  const fullText = promptStr + inputBuffer;
  const inputHeight = fullText.split('\n').length;
  const visibleSugs = Math.min(suggestions.length, MAX_VISIBLE);
  const suggHeight = suggestions.length > 0 ? visibleSugs + 2 : 0;

  // Move cursor up to the top of our render area
  process.stdout.write('\r');
  if (prevCursorLine > 0) moveCursor(process.stdout, 0, -prevCursorLine);

  // Clear everything from here to end of screen
  clearScreenDown(process.stdout);

  // Write the input line(s)
  process.stdout.write(fullText + '\n');

  // Write suggestion box
  if (suggestions.length > 0) {
    const border = theme.rgb(theme.colors.border);
    process.stdout.write(`  ${border}\u250C${'\u2500'.repeat(BOX_W - 2)}\u2510${theme.reset()}\n`);

    for (let i = 0; i < visibleSugs; i++) {
      const idx = scrollOffset + i;
      const s = suggestions[idx];
      const selected = idx === selectedSuggestion;
      const prefix = selected ? '\u25B6 ' : '  ';
      const cmdRaw = s.cmd;
      const cmdPadded = cmdRaw.length >= CMD_W ? cmdRaw : cmdRaw + ' '.repeat(CMD_W - cmdRaw.length);
      const cmdStyled = selected
        ? theme.rgb(theme.colors.textBright) + cmdPadded + theme.reset()
        : theme.style(cmdPadded, 'primary');
      const descMax = DESC_W - (selected ? 1 : 0);
      const descRaw = s.desc.length > descMax ? s.desc.slice(0, descMax - 1) + '\u2026' : s.desc;
      const descPadded = descRaw + ' '.repeat(DESC_W - stripAnsi(descRaw).length);
      const descStyled = theme.style(descPadded, 'textDim');
      const bg = selected ? theme.bgRgb({ r: 40, g: 40, b: 50 }) : '';
      const line = `  ${border}\u2502${theme.reset()} ${bg}${prefix}${cmdStyled} ${descStyled}${theme.reset()} ${border}\u2502${theme.reset()}`;
      process.stdout.write(line + '\n');
    }

    process.stdout.write(`  ${border}\u2514${'\u2500'.repeat(BOX_W - 2)}\u2518${theme.reset()}\n`);
  }

  // Reposition cursor to editing position
  const cursorLineNum = inputBuffer.slice(0, cursorPos).split('\n').length - 1;
  const cursorInLine = inputBuffer.slice(0, cursorPos).split('\n').pop()!.length;
  const linesUp = suggHeight + inputHeight - cursorLineNum;
  moveCursor(process.stdout, 0, -linesUp);
  const col = cursorLineNum === 0 ? promptWidth + cursorInLine : cursorInLine;
  cursorTo(process.stdout, col);

  prevCursorLine = cursorLineNum;
}

// ── Input handling ──────────────────────────────────────────────
function needsInquirer(input: string): boolean {
  if (input.startsWith('/')) return INQUIRER_CMDS.has(input.split(/\s+/)[0].toLowerCase());
  const m = input.match(/^ct\s+(\S+)/i);
  if (m) return INQUIRER_CT.has(m[1].toLowerCase());
  return false;
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
  if (trimmed === '/help') { showCategorizedReplHelp(); return; }
  if (trimmed === '/clear') { clearCommand(); return; }

  if (trimmed.startsWith('/')) {
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
    } else {
      const handler = CMD_HANDLERS[cmd];
      if (handler) {
        if (args.length) await handler(...args);
        else await handler();
      } else logger.warn(`Unknown: ${cmd}. Try /help.`);
    }
  } else if (/^ct\s+/i.test(trimmed)) {
    const rest = trimmed.slice(3).trim();
    const rp = rest.split(/\s+/);
    const entry = CT_HANDLERS[rp[0].toLowerCase()];
    if (entry) {
      if (entry.needsArg && !rp.slice(1).length) {
        logger.warn(`Usage: ct ${rp[0]} <argument>`);
        return;
      }
      const subCmd = rp[0].toLowerCase();
      if (subCmd === 'build') await buildCommand(rp.slice(1).join(' '), askMode, dryRunMode);
      else if (subCmd === 'autofix') await autofixCommand(askMode, dryRunMode);
      else if (subCmd === 'execute') await executeCommand(rp.slice(1).join(' '), askMode, dryRunMode);
      else if (subCmd === 'run') await runCommand(rp.slice(1), askMode);
      else await entry.fn(...rp.slice(1));
    } else {
      await naturalLanguageCommand(rest);
    }
  } else {
    await naturalLanguageCommand(trimmed);
  }
}

async function submit(): Promise<void> {
  const useSuggestion = selectedSuggestion >= 0
    && suggestions[selectedSuggestion]
    && inputBuffer.length >= 1;

  const input = useSuggestion ? suggestions[selectedSuggestion].cmd : inputBuffer;

  // Visually clear the rendered area (input + suggestion box) first,
  // before any handler output or state reset
  process.stdout.write('\r');
  if (prevCursorLine > 0) moveCursor(process.stdout, 0, -prevCursorLine);
  clearScreenDown(process.stdout);

  suggestions = [];
  selectedSuggestion = -1;
  scrollOffset = 0;
  inputBuffer = '';
  cursorPos = 0;
  prevCursorLine = 0;

  process.stdout.write('\n');

  const trimmed = input.trim();
  if (trimmed) {
    history.push(trimmed);
    if (history.length > 200) history = history.slice(-200);
    historyIdx = 0;
  }

  if (trimmed) {
    const inq = needsInquirer(trimmed);
    if (inq) {
      process.stdin.removeListener('keypress', handleKeypress);
      try { process.stdin.setRawMode(false); } catch {}
    }
    try {
      await handleInput(trimmed);
    } catch (e: any) {
      logger.error(`Error: ${e.message}`);
    }
    if (inq) {
      (readline as any).emitKeypressEvents(process.stdin);
      process.stdin.on('keypress', handleKeypress);
      try { process.stdin.setRawMode(true); } catch {}
    }
  }

  console.log('');
  contextBanner();
  console.log('');
  process.stdout.write(promptStr);
  prevCursorLine = 0;
}

function handleKeypress(str: string, key: any): void {
  if (!key) key = {};

  if (key.ctrl && key.name === 'c') {
    process.stdout.write('\r');
    if (prevCursorLine > 0) moveCursor(process.stdout, 0, -prevCursorLine);
    clearScreenDown(process.stdout);
    inputBuffer = '';
    cursorPos = 0;
    suggestions = [];
    selectedSuggestion = -1;
    scrollOffset = 0;
    prevCursorLine = 0;
    process.stdout.write('^C\n');
    process.stdout.write(promptStr);
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
    submit();
    return;
  }

  if (key.name === 'return' && key.shift) {
    inputBuffer = inputBuffer.slice(0, cursorPos) + '\n' + inputBuffer.slice(cursorPos);
    cursorPos++;
    renderInput();
    return;
  }

  if (key.name === 'backspace') {
    if (cursorPos > 0) {
      inputBuffer = inputBuffer.slice(0, cursorPos - 1) + inputBuffer.slice(cursorPos);
      cursorPos--;
      renderInput();
    }
    return;
  }

  if (key.name === 'delete') {
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
    if (suggestions.length > 0) {
      selectedSuggestion = (selectedSuggestion + 1) % suggestions.length;
      renderInput();
    } else {
      const words = inputBuffer.split(/\s+/);
      const lastWord = words[words.length - 1] || '';
      const matches = ALL_CMDS.filter(c => c.toLowerCase().startsWith(lastWord.toLowerCase()) && c.length > lastWord.length);
      if (matches.length === 1) {
        const prefix = inputBuffer.slice(0, inputBuffer.length - lastWord.length);
        inputBuffer = prefix + matches[0] + ' ';
        cursorPos = inputBuffer.length;
        renderInput();
      }
    }
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
      renderInput();
    }
    return;
  }

  if (key.ctrl && key.name === 'l') {
    process.stdout.write('\x1bc');
    console.log('');
    contextBanner();
    console.log('');
    process.stdout.write(promptStr + inputBuffer);
    const bufLines = inputBuffer.split('\n').length;
    prevCursorLine = bufLines - 1;
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
    inputBuffer = inputBuffer.slice(0, cursorPos) + str + inputBuffer.slice(cursorPos);
    cursorPos++;
    renderInput();
    return;
  }
}

export async function replCommand(ask = false, dryRun = false): Promise<void> {
  askMode = ask;
  dryRunMode = dryRun;
  logger.highlight('  Type /help for commands, or just ask anything.');
  console.log('');
  contextBanner();
  console.log('');

  inputBuffer = '';
  cursorPos = 0;
  prevCursorLine = 0;
  historyIdx = 0;
  suggestions = [];
  selectedSuggestion = -1;
  scrollOffset = 0;

  // Register custom keybindings
  customKeys.register('ctrl+p', () => {
    theme.toggle();
    logger.info(`Theme: ${theme.isDark() ? 'dark' : 'light'}`);
  });

  (readline as any).emitKeypressEvents(process.stdin);
  process.stdin.on('keypress', handleKeypress);
  try { process.stdin.setRawMode(true); } catch {}

  process.stdout.write(promptStr);
  prevCursorLine = 0;
}
