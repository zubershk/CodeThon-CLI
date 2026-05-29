import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { LaunchAgent } from '../agents/launch-agent';
import { StateManager } from '../cil/state-manager';
import { HealthScoreCalculator } from '../cil/health-score';
import { createSpinner, logger } from '../utils';
import { renderAgentOutput } from '../utils/render';

export async function launchCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Launch Assets');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  const agent = new LaunchAgent();
  const spinner = createSpinner(chalk.bold.yellow('Generating launch assets...'));
  spinner.start();

  try {
    let started = false;
    let full = '';

    await agent.runStream(
      `Project: ${project.idea}\nStack: ${project.stack}`,
      (token) => {
        if (!started) {
          started = true;
          spinner.stop();
          process.stdout.write('\n');
        }
        full += token;
      }
    );

    process.stdout.write('\n');
    renderAgentOutput(full);
    process.stdout.write('\n');

    state.updateProject({ sprintPhase: 'launching' });

    const health = new HealthScoreCalculator();
    const score = health.calculate();
    logger.bullet(`Health Score: ${score.overall}/100`);

    return { success: true, message: 'Launch assets generated', data: { assets: full } };
  } catch (error) {
    spinner.fail('Failed to generate launch assets');
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to generate launch assets' };
  }
}
