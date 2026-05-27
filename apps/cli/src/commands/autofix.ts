import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { BuildEngine } from '../cil/build-engine';
import { logger, createSpinner } from '../utils';

export async function autofixCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Auto-Fix');

  const engine = new BuildEngine(process.cwd());

  try {
    const spinner = createSpinner(chalk.yellowBright('Scanning for build errors...'));
    spinner.start();

    const analysis = await engine.analyzeProject();
    spinner.succeed(chalk.greenBright('Project analyzed'));

    logger.info(`\n${chalk.cyanBright('\u25B8')} Running build checks on ${analysis.techStack.join(', ') || 'project'}...\n`);

    const fixResult = await engine.autoFix((token) => {
      process.stdout.write(token);
    });

    process.stdout.write('\n');

    if (fixResult.filesFixed > 0) {
      logger.resultSummary('Auto-Fix Complete', [
        `${chalk.greenBright('Files fixed')}: ${fixResult.filesFixed}`,
        `${fixResult.errors.length > 0 ? chalk.redBright('Errors during fix') : chalk.greenBright('Errors')}: ${fixResult.errors.length}`,
      ]);
    } else {
      logger.resultSummary('Auto-Fix Complete', [
        `${chalk.greenBright('No issues found')}`,
      ]);
    }

    return {
      success: fixResult.errors.length === 0,
      message: fixResult.filesFixed > 0 ? `Fixed ${fixResult.filesFixed} files` : 'No issues found',
      data: fixResult,
    };
  } catch (error) {
    logger.error(`Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Auto-fix failed' };
  }
}
