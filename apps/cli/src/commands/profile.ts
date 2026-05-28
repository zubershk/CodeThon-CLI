import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { ProfilerAgent } from '../features/profiler-agent';
import { logger } from '../utils';

export async function profileCommand(): Promise<CommandResult> {
  logger.section('CodeProfiler');
  logger.highlight('Scanning project for performance issues and code smells...');

  const profiler = new ProfilerAgent(process.cwd());
  const findings = await profiler.analyze();

  if (findings.length === 0) {
    logger.success('No issues found. Your code looks clean!');
    return { success: true, message: 'No issues found' };
  }

  const critical = findings.filter(f => f.severity === 'critical').length;
  const high = findings.filter(f => f.severity === 'high').length;
  const medium = findings.filter(f => f.severity === 'medium').length;
  const low = findings.filter(f => f.severity === 'low').length;
  const info = findings.filter(f => f.severity === 'info').length;

  console.log('');
  logger.info(`Found ${chalk.whiteBright(findings.length)} issue(s):`);
  logger.info(`  ${chalk.redBright(`${critical} critical`)}  ${chalk.yellowBright(`${high} high`)}  ${chalk.blueBright(`${medium} medium`)}  ${chalk.gray(`${low} low`)}  ${chalk.dim(`${info} info`)}`);
  console.log('');

  const report = profiler.generateReport(findings);
  console.log(report);

  return { success: true, message: `${findings.length} issue(s) found` };
}
