import chalk from 'chalk';
import type { ProjectState } from '@codethon/shared-types';
import type { LLMConfig } from './config';
import { getProviderDisplayName } from './provider-catalog';

export interface ActionHint {
  command: string;
  description: string;
}

function divider(width = Math.max(62, Math.min(110, (process.stdout.columns || 88) - 4))): string {
  return chalk.dim('─'.repeat(width));
}

function statusColor(status: 'ready' | 'setup' | 'warning'): (text: string) => string {
  if (status === 'ready') return chalk.greenBright;
  if (status === 'warning') return chalk.yellowBright;
  return chalk.magentaBright;
}

export function printHero(title: string, subtitle: string, status: 'ready' | 'setup' | 'warning', badge: string): void {
  const paint = statusColor(status);
  console.log('');
  console.log(`  ${paint('◆')} ${chalk.bold.whiteBright(title)}  ${chalk.dim('·')} ${paint(badge)}`);
  console.log(`  ${chalk.dim(subtitle)}`);
  console.log(`  ${divider()}`);
}

export function printFacts(rows: Array<{ label: string; value: string }>): void {
  for (const row of rows) {
    console.log(`  ${chalk.bold.cyanBright(row.label)}: ${chalk.whiteBright(row.value)}`);
  }
}

export function printActionHints(title: string, hints: ActionHint[], prefix = 'ct'): void {
  if (hints.length === 0) return;
  console.log('');
  console.log(`  ${chalk.bold.whiteBright(title)}`);
  for (const hint of hints) {
    console.log(`  ${chalk.cyanBright(prefix === '/' ? `${prefix}${hint.command}` : `${prefix} ${hint.command}`)}  ${chalk.dim(hint.description)}`);
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
