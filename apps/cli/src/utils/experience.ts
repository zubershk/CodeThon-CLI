import chalk from 'chalk';
import type { ProjectState } from '@codethon/shared-types';
import { stripAnsi, truncateText } from '../ui/terminal-text';
import type { LLMConfig } from './config';
import { getProviderDisplayName } from './provider-catalog';

export interface ActionHint {
  command: string;
  description: string;
}

const oled = {
  cyan: chalk.hex('#74d7ff'),
  lime: chalk.hex('#dfff72'),
  green: chalk.hex('#82f7a6'),
  amber: chalk.hex('#ffcf5c'),
  violet: chalk.hex('#d7a3ff'),
  dim: chalk.hex('#899691'),
  text: chalk.hex('#e0e6e1'),
  bright: chalk.hex('#f7fff9'),
  border: chalk.hex('#31413b'),
};

function terminalWidth(max = 110): number {
  return Math.max(62, Math.min(max, (process.stdout.columns || 88) - 4));
}

function divider(width = terminalWidth()): string {
  return oled.border('─'.repeat(width));
}

function padAnsi(value: string, width: number): string {
  return value + ' '.repeat(Math.max(0, width - stripAnsi(value).length));
}

function statusColor(status: 'ready' | 'setup' | 'warning'): (text: string) => string {
  if (status === 'ready') return oled.green;
  if (status === 'warning') return oled.amber;
  return oled.violet;
}

export function printHero(title: string, subtitle: string, status: 'ready' | 'setup' | 'warning', badge: string): void {
  const width = terminalWidth(112);
  const inner = width - 4;
  const paint = statusColor(status);
  const titleLine = `${paint('*')} ${oled.bright.bold(title)}  ${oled.dim('·')} ${paint(badge)}  ${oled.dim('OLED DARK')}`;
  const subtitleLine = oled.text(truncateText(subtitle, inner));
  console.log('');
  console.log(`  ${oled.cyan(`╭${'─'.repeat(width - 2)}╮`)}`);
  console.log(`  ${oled.cyan('│')} ${padAnsi(titleLine, inner)} ${oled.cyan('│')}`);
  console.log(`  ${oled.cyan('├')}${divider(width - 2)}${oled.cyan('┤')}`);
  console.log(`  ${oled.cyan('│')} ${padAnsi(subtitleLine, inner)} ${oled.cyan('│')}`);
  console.log(`  ${oled.cyan(`╰${'─'.repeat(width - 2)}╯`)}`);
}

export function printFacts(rows: Array<{ label: string; value: string }>): void {
  for (const row of rows) {
    console.log(`  ${oled.cyan.bold(row.label.padEnd(12))} ${oled.bright(row.value)}`);
  }
}

export function printActionHints(title: string, hints: ActionHint[], prefix = 'ct'): void {
  if (hints.length === 0) return;
  console.log('');
  console.log(`  ${oled.lime.bold(title)}`);
  for (const hint of hints) {
    const command = prefix === '/' ? `${prefix}${hint.command}` : `${prefix} ${hint.command}`;
    console.log(`  ${oled.cyan(command.padEnd(22))} ${oled.dim(hint.description)}`);
  }
}

export function buildSuggestedActions(llm: LLMConfig, project?: ProjectState | null): ActionHint[] {
  const providerReady = Boolean(llm.apiKey) || llm.provider === 'ollama' || llm.provider === 'local-server';

  if (!providerReady) {
    return [
      { command: 'auth add', description: 'Connect an AI provider or local model first.' },
      { command: 'doctor', description: 'Verify secrets, network access, and local dependencies.' },
      { command: 'onboard', description: 'Run the guided setup if you want the full first-run flow.' },
    ];
  }

  if (!project) {
    return [
      { command: 'init', description: 'Create or register a project workspace.' },
      { command: 'plan', description: 'Ask CodeThon to turn your idea into a roadmap.' },
      { command: 'execute "<goal>"', description: 'Give the agent a concrete task to complete.' },
    ];
  }

  return [
    { command: 'status', description: 'Inspect current project state, health, and model selection.' },
    { command: 'plan', description: 'Refresh the roadmap or architecture before new work.' },
    { command: 'execute "<goal>"', description: 'Run the autonomous agent against a concrete goal.' },
  ];
}

export function printSessionSnapshot(llm: LLMConfig, project?: ProjectState | null): void {
  const providerLabel = `${getProviderDisplayName(llm.provider)}${llm.apiKey || llm.provider === 'ollama' || llm.provider === 'local-server' ? '' : ' (setup needed)'}`;
  const phase = project?.sprintPhase || 'Not started';
  const projectName = project?.name || 'No active project';

  printFacts([
    { label: 'Project', value: projectName },
    { label: 'Phase', value: phase },
    { label: 'AI', value: `${providerLabel} · ${llm.model || 'No model selected'}` },
  ]);
}
