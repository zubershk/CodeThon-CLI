import fs from 'fs';
import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { TestAgent } from '../features/test-agent';
import { logger } from '../utils';

export async function testGenCommand(...args: string[]): Promise<CommandResult> {
  const testAgent = new TestAgent(process.cwd());
  let sub = args[0]?.toLowerCase();

  if (!sub || sub === 'help') {
    logger.section('Test Agent');
    const cmds = [
      ['status', 'Show detected test framework'],
      ['generate', '<file>  Generate tests for a source file'],
      ['generate-all', '[dir]   Generate tests for all source files'],
      ['coverage', 'Analyze test coverage'],
      ['mutate', 'Run mutation tests to measure test quality'],
    ];
    for (let i = 0; i < cmds.length; i++) {
      logger.info(`  ${chalk.cyanBright(`[${i + 1}]`)} ${chalk.whiteBright(cmds[i][0].padEnd(14))} ${chalk.dim(cmds[i][1])}`);
    }
    console.log('');
    logger.info(chalk.dim('  Type /test <number> or /test <name>, e.g. /test 1 or /test status'));
    return { success: true, message: 'Test commands listed' };
  }

  // Number alias: /test 1 → status
  const numIndex = parseInt(sub, 10);
  const numMap = ['status', 'generate', 'generate-all', 'coverage', 'mutate'];
  if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= numMap.length) {
    sub = numMap[numIndex - 1];
  }

  if (sub === 'status') {
    const framework = testAgent.detectFramework();
    logger.section('Test Status');
    logger.labelValue('Framework', framework, chalk.cyanBright);
    if (framework === 'unknown') {
      logger.info(chalk.yellowBright('  No test framework detected. Install vitest or jest to get started.'));
    }
    return { success: true, message: `Framework: ${framework}` };
  }

  if (sub === 'generate') {
    const file = args[1];
    if (!file) { logger.warn('Usage: /test generate <source-file>'); return { success: false, message: 'Missing file argument' }; }
    if (!fs.existsSync(file)) { logger.warn(`File not found: ${file}`); return { success: false, message: 'File not found' }; }
    logger.highlight(`Generating tests for ${file}...`);
    const result = await testAgent.generateTests(file);
    if (!result) { logger.error('Failed to generate tests'); return { success: false, message: 'Generation failed' }; }
    testAgent.writeTests([result]);
    logger.success(`Tests written to ${chalk.cyanBright(result.file)}`);
    return { success: true, message: `Generated ${result.file}` };
  }

  if (sub === 'generate-all') {
    const dir = args[1] || 'src';
    logger.highlight(`Generating tests for all files in ${dir}...`);
    const results = await testAgent.generateAllTests(dir);
    if (results.length === 0) { logger.info('No new tests needed'); return { success: true, message: 'No tests generated' }; }
    const count = testAgent.writeTests(results);
    logger.success(`Generated ${count} test file(s)`);
    for (const r of results) logger.info(`  ${chalk.dim(r.file)}`);
    return { success: true, message: `${count} test(s) generated` };
  }

  if (sub === 'coverage') {
    logger.highlight('Analyzing coverage...');
    const report = await testAgent.analyzeCoverage();
    if (report.totalLines === 0) { logger.warn('Coverage not available. Try: vitest run --coverage'); return { success: false, message: 'No coverage data' }; }
    logger.section('Coverage Report');
    logger.labelValue('Coverage', `${report.percentage}%`, report.percentage > 80 ? chalk.greenBright : chalk.yellowBright);
    logger.labelValue('Covered', `${report.coveredLines}/${report.totalLines} lines`, chalk.cyanBright);
    return { success: true, message: `Coverage: ${report.percentage}%` };
  }

  if (sub === 'mutate') {
    logger.highlight('Running mutation tests...');
    const result = await testAgent.runMutationTests();
    if (result.total === 0) { logger.warn('Mutation testing requires vitest or jest'); return { success: false, message: 'Unsupported framework' }; }
    logger.section('Mutation Test Results');
    logger.labelValue('Passed', String(result.passed), chalk.greenBright);
    logger.labelValue('Killed', String(result.killed), chalk.redBright);
    logger.labelValue('Total', String(result.total), chalk.cyanBright);
    const score = result.total > 0 ? Math.round((result.killed / result.total) * 100) : 0;
    logger.labelValue('Score', `${score}%`, score > 70 ? chalk.greenBright : chalk.yellowBright);
    return { success: true, message: `Mutation score: ${score}%` };
  }

  logger.warn('Unknown subcommand. Try /test for available commands');
  return { success: false, message: 'Unknown subcommand' };
}
