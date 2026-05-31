import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { GitIntegration } from '../features/git-integration';
import { logger } from '../utils';

export async function gitCommand(...args: string[]): Promise<CommandResult> {
  const git = new GitIntegration(process.cwd());
  let sub = args[0]?.toLowerCase();

  if (!sub || sub === 'help') {
    logger.section('Git Integration');
    const cmds = [
      ['status', 'Show changed files and recent commits'],
      ['diff', 'Show full diff of changes'],
      ['suggest', 'AI-powered commit message suggestion'],
      ['review', 'AI code review of current changes'],
      ['pr', 'Create a PR with AI-generated title/desc'],
      ['branch', 'Suggest a branch name for changes'],
    ];
    for (let i = 0; i < cmds.length; i++) {
      logger.info(`  ${chalk.hex('#74d7ff')(`[${i + 1}]`)} ${chalk.hex('#f7fff9')(cmds[i][0].padEnd(9))} ${chalk.hex('#899691')(cmds[i][1])}`);
    }
    console.log('');
    logger.info(chalk.hex('#899691')('  Type /git <number> or /git <name>, e.g. /git 1 or /git status'));
    return { success: true, message: 'Git commands listed' };
  }

  // Number alias: /git 1 -> status
  const numIndex = parseInt(sub, 10);
  const numMap = ['status', 'diff', 'suggest', 'review', 'pr', 'branch'];
  if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= numMap.length) {
    sub = numMap[numIndex - 1];
  }

  if (sub === 'status') {
    const files = git.getChangedFiles();
    const commits = git.getRecentCommits(5);
    logger.section('Git Status');
    if (files.length > 0) {
      logger.info(`${chalk.hex('#ffcf5c')(`${files.length}`)} changed file(s):`);
      for (const f of files) logger.info(`  ${chalk.hex('#899691')(f)}`);
    } else {
      logger.info(chalk.hex('#899691')('No changes'));
    }
    logger.info('');
    logger.info(chalk.hex('#899691')('Recent commits:'));
    for (const c of commits.split('\n').filter(Boolean)) {
      logger.info(`  ${chalk.hex('#899691')(c)}`);
    }
    return { success: true, message: 'Git status displayed' };
  }

  if (sub === 'diff') {
    const diff = git.getDiff();
    if (!diff) { logger.warn('No changes to show'); return { success: true, message: 'No diff' }; }
    console.log(diff.slice(0, 5000));
    if (diff.length > 5000) logger.info(chalk.hex('#899691')(`... (${diff.length - 5000} more chars)`));
    return { success: true, message: 'Diff displayed' };
  }

  if (sub === 'suggest' || sub === 'commit') {
    logger.highlight('Analyzing changes...');
    const suggestion = await git.generateCommitMessage();
    console.log('');
    logger.info(`${chalk.hex('#f7fff9').bold('Suggested commit:')}`);
    logger.info(`  ${chalk.hex('#74d7ff')(suggestion.type)}${suggestion.scope ? chalk.hex('#899691')(`(${suggestion.scope})`) : ''}: ${suggestion.description}`);
    logger.info(`  ${chalk.hex('#899691')(suggestion.message)}`);
    return { success: true, message: suggestion.message, data: suggestion as any };
  }

  if (sub === 'review') {
    logger.highlight('Reviewing code...');
    const comments = await git.reviewCode();
    if (comments.length === 0) { logger.info(chalk.hex('#82f7a6')('No issues found.')); return { success: true, message: 'No issues' }; }
    logger.section('Code Review');
    for (const c of comments) {
      const icon = c.severity === 'error' ? chalk.hex('#ff5c7a')('\u2717') : c.severity === 'warning' ? chalk.hex('#ffcf5c')('\u26A0') : chalk.hex('#7aa7ff')('\u2139');
      logger.info(`  ${icon} ${chalk.hex('#899691')(c.file)}:${c.line} ${c.message}`);
      if (c.suggestion) logger.info(`    ${chalk.hex('#899691')('Fix:')} ${c.suggestion}`);
    }
    return { success: true, message: `${comments.length} review comment(s)` };
  }

  if (sub === 'pr') {
    logger.highlight('Creating PR...');
    const pr = await git.createPR(args.slice(1).join(' ') || undefined);
    logger.success(`PR created: ${pr.url}`);
    return { success: true, message: `PR: ${pr.url}`, data: pr };
  }

  if (sub === 'branch') {
    const name = await git.suggestBranchName();
    logger.info(`Suggested branch: ${chalk.hex('#74d7ff')(name)}`);
    return { success: true, message: name };
  }

  logger.warn(`Unknown subcommand. Try /git for available commands`);
  return { success: false, message: 'Unknown subcommand' };
}
