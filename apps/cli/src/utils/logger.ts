import chalk from 'chalk';
import { renderAgentOutput, resultSummary as renderSummary } from './render';

export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error' | 'highlight' | 'muted';

const PREFIXES: Record<LogLevel, string> = {
  debug: chalk.dim('\u2502'),
  info: chalk.cyan('\u25B8'),
  success: chalk.green('\u2713'),
  warn: chalk.yellow('\u26A0'),
  error: chalk.red('\u2717'),
  highlight: chalk.magenta('\u25C9'),
  muted: chalk.dim('\u2502'),
};

const COLORS: Record<LogLevel, (s: string) => string> = {
  debug: chalk.dim,
  info: chalk.whiteBright,
  success: chalk.greenBright,
  warn: chalk.yellowBright,
  error: chalk.redBright,
  highlight: chalk.magentaBright,
  muted: chalk.gray,
};

function center(text: string, width = 64): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(pad) + text;
}

function terminalRuleWidth(max = 110): number {
  return Math.max(60, Math.min(max, (process.stdout.columns || 88) - 4));
}

export function log(level: LogLevel, message: string): void {
  const prefix = PREFIXES[level];
  const colorize = COLORS[level];
  console.log(`  ${prefix} ${colorize(message)}`);
}

export function section(title: string): void {
  const line = chalk.bold.cyan('\u2500'.repeat(terminalRuleWidth()));
  console.log('');
  console.log(`  ${line}`);
  console.log(`  ${chalk.bold.cyan('\u25C6')}  ${chalk.bold.whiteBright(title)}`);
  console.log(`  ${line}`);
  console.log('');
}

export function subsection(title: string): void {
  console.log('');
  console.log(`  ${chalk.bold.magentaBright('\u25B8')}  ${chalk.bold.whiteBright(title)}`);
  console.log(`  ${chalk.dim.magentaBright('\u2500'.repeat(40))}`);
}

export function divider(): void {
  console.log(`  ${chalk.dim('\u2500'.repeat(terminalRuleWidth(96)))}`);
}

export function commandBlock(command: string, description?: string): void {
  console.log(`  ${chalk.cyanBright('$')} ${chalk.bold.whiteBright(command)}`);
  if (description) {
    console.log(`  ${chalk.dim('\u2502')}  ${chalk.gray(description)}`);
  }
}

export function outputBlock(text: string): void {
  renderAgentOutput(text);
}

export function labelValue(label: string, value: string, labelColor = chalk.cyanBright): void {
  console.log(`  ${chalk.bold(labelColor(label))}: ${chalk.whiteBright(value)}`);
}

export function bullet(text: string, color = chalk.whiteBright): void {
  console.log(`  ${chalk.cyanBright('\u2022')} ${color(text)}`);
}

export function tip(text: string): void {
  console.log(`  ${chalk.dim('\u2502')} ${chalk.bold.yellowBright('\u2726')} ${chalk.yellowBright(text)}`);
}

export function streamOutput(text: string): void {
  process.stdout.write(chalk.whiteBright(text));
}

export function streamHeading(heading: string): void {
  process.stdout.write(`\n  ${chalk.bold.cyanBright('\u2503')} ${chalk.bold.magentaBright(heading)}\n`);
}

export function showStartupTips(): void {
  const line = chalk.bold.cyanBright('\u2500'.repeat(60));
  console.log('');
  console.log(`${center(chalk.bold.cyanBright('\u25C9\u25C9\u25C9  CodeThon CLI  \u25C9\u25C9\u25C9'))}`);
  console.log(`${center(chalk.dim('AI-native execution orchestration for hackathons'))}`);
  console.log(`  ${line}`);
  console.log('');
  console.log(`  ${chalk.bold.whiteBright('\u25C6')}  ${chalk.bold.greenBright('WORKFLOW')}`);
  console.log(`  ${chalk.dim('\u2502')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct init')}      ${chalk.gray('\u2014')}  ${chalk.whiteBright('Define your project')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct roadmap')}   ${chalk.gray('\u2014')}  ${chalk.whiteBright('Generate milestones')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct architect')} ${chalk.gray('\u2014')}  ${chalk.whiteBright('Design architecture')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct scaffold')}  ${chalk.gray('\u2014')}  ${chalk.whiteBright('Generate starter code')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct debug')}     ${chalk.gray('\u2014')}  ${chalk.whiteBright('Fix errors fast')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct deploy')}    ${chalk.gray('\u2014')}  ${chalk.whiteBright('Ship to production')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct launch')}    ${chalk.gray('\u2014')}  ${chalk.whiteBright('Generate submission assets')}`);
  console.log(`  ${chalk.dim('\u2502')}`);
  console.log(`  ${chalk.bold.whiteBright('\u25C6')}  ${chalk.bold.magentaBright('TOOLS')}`);
  console.log(`  ${chalk.dim('\u2502')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct model')}     ${chalk.gray('\u2014')}  ${chalk.whiteBright('Switch AI model')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct status')}    ${chalk.gray('\u2014')}  ${chalk.whiteBright('Show project status')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct review')}    ${chalk.gray('\u2014')}  ${chalk.whiteBright('Review changes')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct clear')}     ${chalk.gray('\u2014')}  ${chalk.whiteBright('Clear terminal')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct startup')}   ${chalk.gray('\u2014')}  ${chalk.whiteBright('Startup analysis')}`);
  console.log(`  ${chalk.dim('\u2502')}`);
  console.log(`  ${chalk.bold.whiteBright('\u25C6')}  ${chalk.bold.greenBright('AUTONOMOUS')}`);
  console.log(`  ${chalk.dim('\u2502')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct analyze')}   ${chalk.gray('\u2014')}  ${chalk.whiteBright('Scan repo, find issues')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct build')}     ${chalk.gray('\u2014')}  ${chalk.whiteBright('Auto-generate code & fix')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct autofix')}   ${chalk.gray('\u2014')}  ${chalk.whiteBright('Auto-fix build errors')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('ct execute')}   ${chalk.gray('\u2014')}  ${chalk.whiteBright('Autonomous agent — loops until done')}`);
  console.log(`  ${chalk.dim('\u2502')}`);
  console.log(`  ${chalk.bold.whiteBright('\u2726')}  ${chalk.yellowBright('Start with')} ${chalk.cyanBright('ct init')} ${chalk.yellowBright('to begin your project')}`);
  console.log(`  ${line}`);
  console.log('');
  console.log(`  ${center(chalk.gray('Get help: ct <command> --help'))}`);
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
