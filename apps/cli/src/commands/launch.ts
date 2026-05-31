import type { CommandResult } from '@codethon/shared-types';
import { LaunchAgent } from '../agents/launch-agent';
import { StateManager } from '../cil/state-manager';
import { HealthScoreCalculator } from '../cil/health-score';
import { logger } from '../utils';
import { createMarkdownStreamRenderer } from '../utils/render';

export async function launchCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Launch Assets');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `/init` inside ct, or `ct init` from your shell.');
    return { success: false, message: 'No active project' };
  }

  const agent = new LaunchAgent();
  const stream = createMarkdownStreamRenderer({ title: 'Launch Assets' });

  try {
    let full = '';

    await agent.runStream(
      `Project: ${project.idea}\nStack: ${project.stack}`,
      (token) => {
        full += token;
        stream.write(token);
      }
    );
    stream.end();

    process.stdout.write('\n');

    state.updateProject({ sprintPhase: 'launching' });

    const health = new HealthScoreCalculator();
    const score = health.calculate();
    logger.bullet(`Health Score: ${score.overall}/100`);

    return { success: true, message: 'Launch assets generated', data: { assets: full } };
  } catch (error) {
    stream.end();
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to generate launch assets' };
  }
}
