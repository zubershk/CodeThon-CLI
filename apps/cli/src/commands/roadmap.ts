import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { PMAgent } from '../agents/pm-agent';
import { StateManager } from '../cil/state-manager';
import { HealthScoreCalculator } from '../cil/health-score';
import { createSpinner, logger } from '../utils';

export async function roadmapCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Roadmap Generation');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  const agent = new PMAgent();
  const spinner = createSpinner(chalk.bold.yellow('Thinking...'));
  spinner.start();

  try {
    let started = false;
    let fullOutput = '';

    await agent.runStream(
      project.idea,
      (token) => {
        if (!started) {
          started = true;
          spinner.stop();
          process.stdout.write('\n');
        }
        fullOutput += token;
        process.stdout.write(chalk.whiteBright(token));
      }
    );

    process.stdout.write('\n\n');

    const health = new HealthScoreCalculator();
    const score = health.calculate();
    logger.bullet(`Health Score: ${score.overall}/100`);

    return { success: true, message: 'Roadmap generated', data: { roadmap: fullOutput } };
  } catch (error) {
    spinner.fail('Failed to generate roadmap');
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to generate roadmap' };
  }
}
