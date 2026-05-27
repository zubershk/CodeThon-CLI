import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { getRuntime } from '../runtime';
import { logger } from '../utils';

export async function diffCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Git Diff');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project.');
    return { success: false, message: 'No active project' };
  }

  const runtime = getRuntime();
  const result = await runtime.execute('git diff', 15000);

  if (result.success && result.stdout) {
    const lines = result.stdout.split('\n');
    for (const line of lines) {
      if (line.startsWith('+')) {
        console.log(`  ${chalk.greenBright(line)}`);
      } else if (line.startsWith('-')) {
        console.log(`  ${chalk.redBright(line)}`);
      } else if (line.startsWith('@@')) {
        console.log(`  ${chalk.cyanBright(line)}`);
      } else if (line.startsWith('diff --git') || line.startsWith('index') || line.startsWith('---') || line.startsWith('+++')) {
        console.log(`  ${chalk.bold.magentaBright(line)}`);
      } else {
        console.log(`  ${chalk.whiteBright(line)}`);
      }
    }
  } else {
    logger.warn('No diff available');
  }

  return { success: true, message: 'Diff displayed' };
}
