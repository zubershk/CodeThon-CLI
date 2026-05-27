import type { CommandResult } from '@codethon/shared-types';
import { LaunchAgent } from '../agents/launch-agent';
import { StateManager } from '../cil/state-manager';
import { createSpinner, logger } from '../utils';
import { writeFile } from '../utils/file-utils';
import path from 'path';

export async function readmeCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — README Generation');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  const agent = new LaunchAgent();
  const spinner = createSpinner('Generating README...');
  spinner.start();

  try {
    const output = await agent.run('readme', `Project: ${project.idea}\nStack: ${project.stack}`);

    spinner.succeed('README generated!');
    logger.info('');
    logger.outputBlock(output.details);

    const readmePath = path.join(process.cwd(), 'README.md');
    writeFile(readmePath, output.details);
    logger.info('');
    logger.labelValue('Saved to', readmePath);

    project.outputs.push('README generated');
    state.updateProject({ outputs: project.outputs });

    return { success: true, message: 'README generated', data: { readme: output.details } };
  } catch (error) {
    spinner.fail('Failed to generate README');
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Failed to generate README' };
  }
}
