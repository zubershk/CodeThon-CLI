import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { getRuntime } from '../runtime';
import { logger } from '../utils';

export async function reviewCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Review Changes');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project.');
    return { success: false, message: 'No active project' };
  }

  const runtime = getRuntime();
  const result = await runtime.execute('git diff --stat', 10000);

  if (result.success && result.stdout) {
    logger.info(chalk.greenBright('Modified files:'));
    logger.info(result.stdout);
    logger.info('');
    logger.info(chalk.dim('Run `ct diff` for full diff'));
  } else {
    logger.info(chalk.yellowBright('No changes detected'));
  }

  return { success: true, message: 'Review complete' };
}
