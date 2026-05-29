import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { PMAgent } from '../agents/pm-agent';
import { ArchitectAgent } from '../agents/architect-agent';
import { StateManager } from '../cil/state-manager';
import { HealthScoreCalculator } from '../cil/health-score';
import { createSpinner, logger } from '../utils';

function parseArgs(args: string): { stack?: string; feature?: string } {
  const parts = args.split(/\s+/);
  let stack: string | undefined;
  let feature: string | undefined;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '--stack' && i + 1 < parts.length) {
      stack = parts[++i].replace(/["']/g, '');
    } else if (parts[i] === '--feature' && i + 1 < parts.length) {
      feature = parts[++i].replace(/["']/g, '');
    }
  }
  return { stack, feature };
}

export async function planCommand(args = ''): Promise<CommandResult> {
  const { stack, feature } = parseArgs(args);

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

  const contextParts = [`Project: ${project.idea}`];
  contextParts.push(`Stack: ${stack || project.stack}`);
  if (feature) contextParts.push(`Feature: ${feature}`);
  const agentInput = contextParts.join('\n');

  const spinner = createSpinner(chalk.bold.yellow('Thinking...'));
  spinner.start();

  try {
    // ── Step 1: Roadmap ──
    spinner.update('Generating roadmap...');
    let started = false;
    const pmAgent = new PMAgent();

    process.stdout.write(`\n  ${chalk.bold.cyan('\u2501'.repeat(46))}\n`);
    process.stdout.write(`  ${chalk.bold.whiteBright('\u25B8  ROADMAP')}\n`);
    process.stdout.write(`  ${chalk.bold.cyan('\u2501'.repeat(46))}\n\n`);

    await pmAgent.runStream(agentInput, (token) => {
      if (!started) {
        started = true;
        spinner.stop();
      }
      process.stdout.write(chalk.whiteBright(token));
    });

    process.stdout.write('\n\n');

    // ── Step 2: Architecture ──
    spinner.start();
    spinner.update('Designing architecture...');
    started = false;
    const archAgent = new ArchitectAgent();

    process.stdout.write(`  ${chalk.bold.magenta('\u2501'.repeat(46))}\n`);
    process.stdout.write(`  ${chalk.bold.whiteBright('\u25B8  ARCHITECTURE')}\n`);
    process.stdout.write(`  ${chalk.bold.magenta('\u2501'.repeat(46))}\n\n`);

    await archAgent.runStream(agentInput, (token) => {
      if (!started) {
        started = true;
        spinner.stop();
      }
      process.stdout.write(token);
    });

    process.stdout.write('\n\n');
    spinner.stop();

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
    spinner.fail('Failed to generate plan');
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to generate plan' };
  }
}
