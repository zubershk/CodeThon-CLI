import chalk from 'chalk';
import { renderAgentOutput, resultSummary as renderSummary } from './render';
import { stripAnsi, truncateText } from '../ui/terminal-text';

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error' | 'highlight' | 'muted';

const oled = {
  cyan: chalk.hex('#74d7ff'),
  lime: chalk.hex('#dfff72'),
  green: chalk.hex('#82f7a6'),
  amber: chalk.hex('#ffcf5c'),
  red: chalk.hex('#ff5c7a'),
  text: chalk.hex('#e0e6e1'),
  bright: chalk.hex('#f7fff9'),
  border: chalk.hex('#31413b'),
  dim: chalk.hex('#899691'),
};

const PREFIXES: Record<LogLevel, string> = {
  debug: oled.dim('\u2502'),
  info: oled.cyan('▶'),
  success: oled.green('◆'),
  warn: oled.amber('▲'),
  error: oled.red('■'),
  highlight: oled.lime('●'),
  muted: oled.dim('\u2502'),
};

const COLORS: Record<LogLevel, (s: string) => string> = {
  debug: oled.dim,
  info: chalk.hex('#f7fff9'),
  success: oled.green,
  warn: oled.amber,
  error: oled.red,
  highlight: oled.lime,
  muted: oled.dim,
};

function center(text: string, width = 64): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function terminalRuleWidth(max = 110): number {
  return Math.max(60, Math.min(max, (process.stdout.columns || 88) - 4));
}

function padAnsi(value: string, width: number): string {
  return value + ' '.repeat(Math.max(0, width - stripAnsi(value).length));
}

export function log(level: LogLevel, message: string): void {
  const prefix = PREFIXES[level];
  const colorize = COLORS[level];
  console.log(`  ${prefix} ${colorize(message)}`);
}

export function section(title: string): void {
  const width = terminalRuleWidth(112);
  const inner = width - 4;
  const titleLine = `${oled.lime('\u25C6')}  ${oled.bright.bold(truncateText(title, inner - 16))} ${oled.dim('OLED DARK')}`;
  console.log('');
  console.log(`  ${oled.cyan(`╭${'─'.repeat(width - 2)}╮`)}`);
  console.log(`  ${oled.cyan('│')} ${padAnsi(titleLine, inner)} ${oled.cyan('│')}`);
  console.log(`  ${oled.cyan(`╰${oled.border('─'.repeat(width - 2))}╯`)}`);
  console.log('');
}

export function subsection(title: string): void {
  console.log('');
  console.log(`  ${oled.cyan('\u25B8')}  ${oled.bright.bold(title)}`);
  console.log(`  ${oled.border('\u2500'.repeat(Math.min(52, terminalRuleWidth(72))))}`);
}

export function divider(): void {
  console.log(`  ${oled.dim('\u2500'.repeat(terminalRuleWidth(96)))}`);
}

export function commandBlock(command: string, description?: string): void {
  console.log(`  ${oled.lime('$')} ${chalk.hex('#f7fff9').bold(command)}`);
  if (description) {
    console.log(`  ${oled.dim('\u2502')}  ${oled.dim(description)}`);
  }
}

export function outputBlock(text: string): void {
  renderAgentOutput(text);
}

export function labelValue(label: string, value: string, labelColor = oled.cyan): void {
  console.log(`  ${chalk.bold(labelColor(label.padEnd(14)))} ${oled.bright(value)}`);
}

export function bullet(text: string, color = chalk.hex('#f7fff9')): void {
  console.log(`  ${oled.cyan('\u2022')} ${color(text)}`);
}

export function tip(text: string): void {
  console.log(`  ${oled.dim('\u2502')} ${oled.lime('\u2726')} ${oled.amber(text)}`);
}

export function streamOutput(text: string): void {
  process.stdout.write(chalk.hex('#f7fff9')(text));
}

export function streamHeading(heading: string): void {
  process.stdout.write(`\n  ${oled.cyan('\u2503')} ${oled.lime(heading)}\n`);
}

export function showStartupTips(): void {
  const line = oled.cyan('\u2500'.repeat(60));
  console.log('');
  console.log(`${center(oled.lime('\u25C9\u25C9\u25C9  CodeThon CLI  \u25C9\u25C9\u25C9'))}`);
  console.log(`${center(oled.dim('AI-native execution orchestration for hackathons'))}`);
  console.log(`  ${line}`);
  console.log('');
  console.log(`  ${chalk.hex('#f7fff9').bold('\u25C6')}  ${oled.green('WORKFLOW')}`);
  console.log(`  ${oled.dim('\u2502')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/init')}      ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Define your project')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/roadmap')}   ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Generate milestones')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/architect')} ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Design architecture')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/scaffold')}  ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Generate starter code')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/debug')}     ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Fix errors fast')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/deploy')}    ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Ship to production')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/launch')}    ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Generate submission assets')}`);
  console.log(`  ${oled.dim('\u2502')}`);
  console.log(`  ${chalk.hex('#f7fff9').bold('\u25C6')}  ${oled.lime('TOOLS')}`);
  console.log(`  ${oled.dim('\u2502')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/model')}     ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Switch AI model')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/status')}    ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Show project status')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/review')}    ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Review changes')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/clear')}     ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Clear terminal')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/startup')}   ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Startup analysis')}`);
  console.log(`  ${oled.dim('\u2502')}`);
  console.log(`  ${chalk.hex('#f7fff9').bold('\u25C6')}  ${oled.green('AUTONOMOUS')}`);
  console.log(`  ${oled.dim('\u2502')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/analyze')}   ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Scan repo, find issues')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/build')}     ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Auto-generate code and fix')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/autofix')}   ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Auto-fix build errors')}`);
  console.log(`  ${oled.dim('\u2502')}  ${oled.cyan('/execute')}   ${oled.dim('\u2014')}  ${chalk.hex('#f7fff9')('Autonomous agent loops until done')}`);
  console.log(`  ${oled.dim('\u2502')}`);
  console.log(`  ${chalk.hex('#f7fff9').bold('\u2726')}  ${oled.amber('Start with')} ${oled.cyan('/init')} ${oled.amber('inside the REPL')}`);
  console.log(`  ${line}`);
  console.log('');
  console.log(`  ${center(oled.dim('Get help: /help inside ct, or ct <command> --help'))}`);
  console.log('');
}

export function resultBox(content: string): void {
  renderAgentOutput(content);
}

export const logger = {
  debug: (msg: string) => log('debug', msg),
  info: (msg: string) => log('info', msg),
  success: (msg: string) => log('success', msg),
  warn: (msg: string) => log('warn', msg),
  error: (msg: string) => log('error', msg),
  highlight: (msg: string) => log('highlight', msg),
  muted: (msg: string) => log('muted', msg),
  section,
  subsection,
  divider,
  commandBlock,
  outputBlock,
  labelValue,
  bullet,
  tip,
  streamOutput,
  streamHeading,
  showStartupTips,
  resultBox,
  center,
  resultSummary: renderSummary,
};
