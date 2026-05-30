import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { PMAgent } from '../agents/pm-agent';
import { ArchitectAgent } from '../agents/architect-agent';
import { StateManager } from '../cil/state-manager';
import { HealthScoreCalculator } from '../cil/health-score';
import { logger } from '../utils';
import { printActionHints, printFacts } from '../utils/experience';
import { promptInput } from '../utils/prompt';
import { createMarkdownStreamRenderer } from '../utils/render';

function parseArgs(args: string): { stack?: string; feature?: string; goal?: string } {
  const parts = args.split(/\s+/);
  let stack: string | undefined;
  let feature: string | undefined;
  const goalParts: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '--stack' && i + 1 < parts.length) {
      stack = parts[++i].replace(/["']/g, '');
    } else if (parts[i] === '--feature' && i + 1 < parts.length) {
      feature = parts[++i].replace(/["']/g, '');
    } else if (parts[i]) {
      goalParts.push(parts[i]);
    }
  }
  return { stack, feature, goal: goalParts.join(' ').trim() || undefined };
}

function looksLikePlaceholderIdea(value?: string): boolean {
  const normalized = (value || '').trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.length < 8) return true;
  if (/^(test|demo|asdf|qwerty|todo|sample|project|app|fg+|[a-z])$/i.test(normalized)) return true;
  if (/^([a-z]{1,3})\1{2,}$/i.test(normalized)) return true;
  const letters = normalized.replace(/[^a-z]/g, '');
  if (letters.length >= 5 && !/[aeiou]/.test(letters)) return true;
  return false;
}

function terminalWidth(): number {
  return Math.max(60, Math.min(110, (process.stdout.columns || 88) - 4));
}

function printPlanRunPanel(rows: Array<{ label: string; value: string }>): void {
  const width = terminalWidth();
  const inner = width - 4;
  const title = 'Plan run';
  const subtitle = 'roadmap + architecture';
  const titleLine = `${title} ${subtitle}`.padEnd(inner);
  console.log(`  ${chalk.cyan('┌')}${chalk.cyan('─'.repeat(width - 2))}${chalk.cyan('┐')}`);
  console.log(`  ${chalk.cyan('│')} ${chalk.bold.whiteBright(titleLine.slice(0, title.length))}${chalk.dim(titleLine.slice(title.length))} ${chalk.cyan('│')}`);
  console.log(`  ${chalk.cyan('├')}${chalk.cyan('─'.repeat(width - 2))}${chalk.cyan('┤')}`);
  for (const row of rows) {
    const label = `${row.label}:`.padEnd(10);
    const value = row.value.replace(/\s+/g, ' ');
    const text = `${label} ${value}`;
    const clipped = text.length > inner ? `${text.slice(0, inner - 1)}…` : text.padEnd(inner);
    console.log(`  ${chalk.cyan('│')} ${chalk.dim(clipped)} ${chalk.cyan('│')}`);
  }
  console.log(`  ${chalk.cyan('└')}${chalk.cyan('─'.repeat(width - 2))}${chalk.cyan('┘')}`);
  console.log('');
}

async function resolvePlanningIdea(projectIdea: string, explicitGoal?: string): Promise<string | null> {
  if (explicitGoal && !looksLikePlaceholderIdea(explicitGoal)) return explicitGoal;
  if (!looksLikePlaceholderIdea(projectIdea)) return explicitGoal || projectIdea;

  logger.warn('The current project idea looks like placeholder text.');
  printFacts([
    { label: 'Current idea', value: projectIdea || 'empty' },
    { label: 'Needed', value: 'A short real description, for example: "AI study planner for college students".' },
  ]);

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    printActionHints('Next actions', [
      { command: 'init', description: 'Update the project idea interactively.' },
      { command: 'plan "your real project idea"', description: 'Generate a plan from a real goal.' },
    ]);
    return null;
  }

  const idea = (await promptInput({
    message: 'What are you actually building?',
    validate: value => looksLikePlaceholderIdea(value)
      ? 'Enter a real product idea, not placeholder text.'
      : true,
  })).trim();

  return idea;
}

export async function planCommand(args = ''): Promise<CommandResult> {
  const { stack, feature, goal } = parseArgs(args);

  logger.section('CodeThon CLI — Plan (Roadmap + Architecture)');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  if (stack) {
    state.updateProject({ stack } as any);
  }

  const idea = await resolvePlanningIdea(project.idea, goal);
  if (!idea) {
    return { success: false, message: 'A real project idea is required before planning' };
  }

  if (idea !== project.idea) {
    state.updateProject({ idea, name: idea } as any);
  }

  printPlanRunPanel([
    { label: 'Project', value: idea },
    { label: 'Stack', value: stack || project.stack || 'Not selected' },
    { label: 'Mode', value: 'roadmap + architecture' },
    { label: 'Controls', value: 'Ctrl+C cancels the command. Generated text streams live below.' },
  ]);

  const contextParts = [
    `Project: ${idea}`,
    'Output style: write for a terminal CLI. Be direct, concrete, and structured. Do not include raw JSON.',
    'If information is missing, make safe assumptions and list them instead of scolding the user.',
  ];
  contextParts.push(`Stack: ${stack || project.stack}`);
  if (feature) contextParts.push(`Feature: ${feature}`);
  const agentInput = contextParts.join('\n');

  let activeStream: ReturnType<typeof createMarkdownStreamRenderer> | null = null;

  try {
    // ── Step 1: Roadmap ──
    const roadmapStream = createMarkdownStreamRenderer({ title: 'Roadmap' });
    activeStream = roadmapStream;
    const pmAgent = new PMAgent();

    await pmAgent.runStream(agentInput, (token) => {
      roadmapStream.write(token);
    });
    roadmapStream.end();
    activeStream = null;
    process.stdout.write('\n');

    // ── Step 2: Architecture ──
    const architectureStream = createMarkdownStreamRenderer({ title: 'Architecture' });
    activeStream = architectureStream;
    const archAgent = new ArchitectAgent();

    await archAgent.runStream(agentInput, (token) => {
      architectureStream.write(token);
    });
    architectureStream.end();
    activeStream = null;
    process.stdout.write('\n');

    // ── Health Score ──
    const health = new HealthScoreCalculator();
    const score = health.calculate();
    logger.bullet(`Health Score: ${score.overall}/100`);

    return {
      success: true,
      message: 'Plan generated (roadmap + architecture)',
      data: { stack: stack || project.stack, feature },
    };
  } catch (error) {
    activeStream?.end();
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to generate plan' };
  }
}
