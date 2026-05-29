import type { CommandResult } from '@codethon/shared-types';
import { ArchitectAgent } from '../agents/architect-agent';
import { StateManager } from '../cil/state-manager';
import { HealthScoreCalculator } from '../cil/health-score';
import { logger } from '../utils';

export async function architectCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Architecture Design');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  const agent = new ArchitectAgent();
  logger.info('Designing your architecture...\n');

  try {
    let fullOutput = '';
    await agent.runStream(
      `Project: ${project.idea}\nStack: ${project.stack}\nExperience: ${project.experienceLevel}`,
      (token) => {
        process.stdout.write(token);
        fullOutput += token;
      }
    );

    logger.info('');
    logger.info('');

    const health = new HealthScoreCalculator();
    const score = health.calculate();
    logger.bullet(`Health Score: ${score.overall}/100`);

    return { success: true, message: 'Architecture generated', data: { architecture: fullOutput } };
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to design architecture' };
  }
}
