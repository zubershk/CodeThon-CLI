import type { CommandResult } from '@codethon/shared-types';
import { StartupAgent } from '../agents/startup-agent';
import { StateManager } from '../cil/state-manager';
import { createSpinner, logger } from '../utils';

export async function startupCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Startup Analysis');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  const agent = new StartupAgent();
  const spinner = createSpinner('Analyzing startup potential...');
  spinner.start();

  try {
    const output = await agent.run(
      `Project: ${project.idea}\nStack: ${project.stack}\nTimeline: ${project.timeline}`,
    );

    spinner.succeed('Startup analysis complete!');
    logger.info('');
    logger.outputBlock(output.details);
    logger.info('');

    project.outputs.push('Startup analysis generated');
    state.updateProject({ outputs: project.outputs });

    return { success: true, message: 'Startup analysis complete', data: { analysis: output.details } };
  } catch (error) {
    spinner.fail('Failed to analyze startup potential');
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to analyze startup potential' };
  }
}
