import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { JobLoop } from '../cil/job-loop';
import type { JobStatus } from '../cil/job-loop';
import { logger } from '../utils';
import { renderAgentOutput } from '../utils/render';

export async function executeCommand(goal: string): Promise<CommandResult> {
  if (!goal) {
    logger.error('No goal specified. Usage: ct execute "<goal>"');
    return { success: false, message: 'No goal specified' };
  }

  logger.section(`CodeThon CLI — Execute: ${chalk.bold(goal)}`);

  const loop = new JobLoop(process.cwd(), 20);
  let errors: string[] = [];

  logger.info(`${chalk.cyanBright('\u25B8')} Starting autonomous execution loop (max 20 iterations)\n`);

  const result = await loop.execute(goal, (status: JobStatus) => {
    if (status.phase === 'plan' && !status.done) {
      // Print iteration header
      const bar = chalk.bold.cyan('\u2500'.repeat(48));
      console.log(`\n  ${bar}`);
      console.log(`  ${chalk.bold.cyanBright('\u25B6')}  ${chalk.bold.whiteBright(`Iteration ${status.iteration + 1}`)}`);
      console.log(`  ${bar}`);
    } else if (status.phase === 'execute') {
      const icon = status.description.startsWith('Read:') ? chalk.cyanBright('\u25CB') :
                   status.description.startsWith('Write:') ? chalk.greenBright('\u270E') :
                   status.description.startsWith('Run:') ? chalk.yellowBright('\u25B8') :
                   status.description.startsWith('Search:') || status.description.startsWith('Grep:') ? chalk.magentaBright('\u2315') :
                   status.description.startsWith('Find:') ? chalk.magentaBright('\u2315') :
                   chalk.cyanBright('\u25B8');
      console.log(`  ${icon} ${chalk.whiteBright(status.description)}`);
    } else if (status.phase === 'done') {
      if (status.error) {
        errors.push(status.error);
      }
    }
  });

  // Final report
  const bar = chalk.bold.greenBright('\u2501'.repeat(50));
  console.log(`\n  ${bar}`);
  console.log(`  ${chalk.bold.greenBright(result.success ? '\u2713' : '\u26A0')}  ${chalk.bold.whiteBright('Execution Complete')}`);
  console.log(`  ${bar}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.bold.whiteBright('Iterations')}: ${chalk.cyanBright(result.iterations)}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.bold.whiteBright('Status')}:    ${result.success ? chalk.greenBright('Goal met') : chalk.yellowBright('Max iterations reached')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.bold.whiteBright('Errors')}:    ${errors.length > 0 ? chalk.redBright(errors.join('; ')) : chalk.greenBright('None')}`);
  console.log(`  ${bar}`);
  console.log('');
  console.log(`  ${chalk.bold.whiteBright('Summary')}:`);
  renderAgentOutput(result.summary);

  return {
    success: result.success,
    message: result.summary,
    data: result,
  };
}
