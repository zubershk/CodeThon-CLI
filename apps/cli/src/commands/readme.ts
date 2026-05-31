import type { CommandResult } from '@codethon/shared-types';
import { LaunchAgent } from '../agents/launch-agent';
import { StateManager } from '../cil/state-manager';
import { logger } from '../utils';
import { writeFile } from '../utils/file-utils';
import { createMarkdownStreamRenderer } from '../utils/render';
import path from 'path';

export async function readmeCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — README Generation');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `/init` inside ct, or `ct init` from your shell.');
    return { success: false, message: 'No active project' };
  }

  const agent = new LaunchAgent();
  const stream = createMarkdownStreamRenderer({ title: 'README Draft' });

  try {
    const details = await agent.runStream(
      'readme',
      token => stream.write(token),
      `Project: ${project.idea}\nStack: ${project.stack}`,
    );
    stream.end();

    const readmePath = path.join(process.cwd(), 'README.md');
    writeFile(readmePath, details);
    logger.info('');
    logger.labelValue('Saved to', readmePath);

    project.outputs.push('README generated');
    state.updateProject({ outputs: project.outputs });

    return { success: true, message: 'README generated', data: { readme: details } };
  } catch (error) {
    stream.end();
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Failed to generate README' };
  }
}
