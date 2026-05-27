import inquirer from 'inquirer';
import type { CommandResult } from '@codethon/shared-types';
import { DevOpsAgent } from '../agents/devops-agent';
import { createSpinner, logger } from '../utils';

export async function deployCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Deployment Guide');

  const { platform } = await inquirer.prompt([
    {
      type: 'list',
      name: 'platform',
      message: 'Where do you want to deploy?',
      choices: [
        { name: '  Vercel (recommended for Next.js)', value: 'Vercel' },
        { name: '  Railway (general backend)', value: 'Railway' },
        { name: '  Render (full-stack)', value: 'Render' },
        { name: '  Supabase (database + auth)', value: 'Supabase' },
        { name: '  Auto-detect best platform', value: 'auto' },
      ],
    },
  ]);

  const agent = new DevOpsAgent();
  const spinner = createSpinner(`Generating deployment guide for ${platform}...`);
  spinner.start();

  try {
    const output = await agent.run(platform);

    spinner.succeed('Deployment guide ready!');
    logger.info('');
    logger.outputBlock(output.details);
    logger.info('');
    logger.divider();
    logger.info('After deploying, track your deployment status:');
    logger.commandBlock('ct init');
    logger.muted('   └─ Update project state with deployment info');

    return { success: true, message: 'Deployment guide generated', data: { guide: output.details } };
  } catch (error) {
    spinner.fail('Failed to generate deployment guide');
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Failed to generate deployment guide' };
  }
}
