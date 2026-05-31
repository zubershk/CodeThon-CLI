import type { CommandResult } from '@codethon/shared-types';
import { PMAgent } from '../agents/pm-agent';
import { StateManager } from '../cil/state-manager';
import { HealthScoreCalculator } from '../cil/health-score';
import { logger } from '../utils';
import { createMarkdownStreamRenderer } from '../utils/render';

export async function roadmapCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Roadmap Generation');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `/init` inside ct, or `ct init` from your shell.');
    return { success: false, message: 'No active project' };
  }

  const agent = new PMAgent();
  const stream = createMarkdownStreamRenderer({ title: 'Roadmap' });

  try {
    let fullOutput = '';

    await agent.runStream(
      project.idea,
      (token) => {
        fullOutput += token;
        stream.write(token);
      }
    );
    stream.end();

    process.stdout.write('\n\n');

    const health = new HealthScoreCalculator();
    const score = health.calculate();
    logger.bullet(`Health Score: ${score.overall}/100`);

    return { success: true, message: 'Roadmap generated', data: { roadmap: fullOutput } };
  } catch (error) {
    stream.end();
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to generate roadmap' };
  }
}
