import type { CommandResult } from '@codethon/shared-types';
import { StartupAgent } from '../agents/startup-agent';
import { StateManager } from '../cil/state-manager';
import { logger } from '../utils';
import { createMarkdownStreamRenderer } from '../utils/render';

export async function startupCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Startup Analysis');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `/init` inside ct, or `ct init` from your shell.');
    return { success: false, message: 'No active project' };
  }

  const agent = new StartupAgent();
  const stream = createMarkdownStreamRenderer({ title: 'Startup Analysis' });

  try {
    const analysis = await agent.runStream(
      `Project: ${project.idea}\nStack: ${project.stack}\nTimeline: ${project.timeline}`,
      token => stream.write(token),
    );
    stream.end();

    logger.info('');

    project.outputs.push('Startup analysis generated');
    state.updateProject({ outputs: project.outputs });

    return { success: true, message: 'Startup analysis complete', data: { analysis } };
  } catch (error) {
    stream.end();
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to analyze startup potential' };
  }
}
