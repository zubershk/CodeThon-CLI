import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { spawnSync } from 'child_process';
import type { CommandResult } from '@codethon/shared-types';
import { createSpinner, logger } from '../utils';
import { StateManager } from '../cil/state-manager';
import { sanitizeEnv, resolveBin } from '../utils/env';

interface DeployResult {
  platform: string;
  url: string;
  success: boolean;
  error?: string;
}

function spawnSafe(bin: string, args: string[], opts: { timeout?: number; cwd?: string; stdio?: 'pipe' | 'inherit' } = {}): ReturnType<typeof spawnSync> {
  const spawnBin = resolveBin(bin);
  const needsShell = process.platform === 'win32' && (bin.endsWith('.cmd') || spawnBin.endsWith('.cmd'));
  return spawnSync(spawnBin, args, {
    timeout: opts.timeout ?? 30000,
    encoding: 'utf-8',
    shell: needsShell,
    cwd: opts.cwd,
    stdio: opts.stdio ?? 'pipe',
    env: sanitizeEnv(),
    maxBuffer: 1024 * 1024,
  });
}

async function vercelDeploy(): Promise<DeployResult> {
  logger.info('Vercel deployment requires a Vercel account. Log in if prompted.');

  const vercelCheck = spawnSafe('npx', ['vercel', '--version'], { timeout: 15000 });

  if (vercelCheck.error || vercelCheck.status !== 0) {
    const { install } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'install',
        message: 'Vercel CLI not found. Install it now?',
        default: true,
      },
    ]);
    if (!install) {
      return { platform: 'Vercel', url: '', success: false, error: 'Vercel CLI not installed' };
    }
    const installSpinner = createSpinner('Installing Vercel CLI...');
    installSpinner.start();
    const installResult = spawnSafe('npm', ['install', '-g', 'vercel'], { timeout: 60000 });
    if (installResult.error || installResult.status !== 0) {
      installSpinner.fail('Failed to install Vercel CLI');
      return { platform: 'Vercel', url: '', success: false, error: 'Failed to install Vercel CLI' };
    }
    installSpinner.succeed('Vercel CLI installed');
  }

  const buildSpinner = createSpinner('Building project for production...');
  buildSpinner.start();

  const buildResult = spawnSafe('npm', ['run', 'build'], { cwd: process.cwd(), timeout: 120000 });

  if (buildResult.error || buildResult.status !== 0) {
    buildSpinner.fail('Build failed');
    return { platform: 'Vercel', url: '', success: false, error: (buildResult.stderr as string)?.slice(0, 500) || 'Build failed' };
  }
  buildSpinner.succeed('Build complete');

  const deploySpinner = createSpinner('Deploying to Vercel...');
  deploySpinner.start();

  const deployResult = spawnSafe('npx', ['vercel', '--prod', '--yes', '--token', process.env.VERCEL_TOKEN || ''], { cwd: process.cwd(), timeout: 180000 });

  if (deployResult.error || deployResult.status !== 0) {
    deploySpinner.fail('Deployment failed');
    const errorMsg = (deployResult.stderr as string)?.slice(0, 500) || (deployResult.stdout as string)?.slice(0, 500) || 'Deployment failed';
    if (errorMsg.includes('not authenticated') || errorMsg.includes('login')) {
      logger.info('Attempting interactive deploy...');
      const interactiveResult = spawnSafe('npx', ['vercel', '--prod'], { cwd: process.cwd(), timeout: 180000, stdio: 'inherit' });
      if (interactiveResult.status != null && interactiveResult.status === 0) {
        deploySpinner.succeed('Deployment complete!');
        return { platform: 'Vercel', url: 'https://[your-project].vercel.app', success: true };
      }
    }
    return { platform: 'Vercel', url: '', success: false, error: errorMsg };
  }

  deploySpinner.succeed('Deployed to Vercel!');

  const urlMatch = (deployResult.stdout as string)?.match(/https:\/\/[^\s]+\.vercel\.app/);
  const url = urlMatch?.[0] || 'https://[your-project].vercel.app';

  return { platform: 'Vercel', url, success: true };
}

export async function deployCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Deploy');

  const state = new StateManager();
  const project = state.getProject();

  const { action } = await inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What do you want to do?',
      choices: [
        { name: '  Deploy to Vercel', value: 'vercel' },
        { name: '  Show deployment history', value: 'history' },
        { name: '  Generate deployment guide', value: 'guide' },
      ],
    },
  ]);

  if (action === 'guide') {
    const { DevOpsAgent } = await import('../agents/devops-agent');
    const agent = new DevOpsAgent();
    const spinner = createSpinner('Generating deployment guide...');
    spinner.start();
    try {
      const output = await agent.run('auto');
      spinner.succeed('Deployment guide ready!');
      logger.info('');
      logger.outputBlock(output.details);
      return { success: true, message: 'Deployment guide generated' };
    } catch {
      spinner.fail('Failed to generate guide');
      logger.info('');
      logger.info(chalk.bold.cyan('  Recommended deployment platforms:'));
      logger.info('');
      logger.info(`  ${chalk.dim('Next.js')}    ${chalk.green('\u2192')}  Vercel (zero-config)`);
      logger.info(`  ${chalk.dim('Vite/React')}  ${chalk.green('\u2192')}  Vercel or Netlify`);
      logger.info(`  ${chalk.dim('Express')}    ${chalk.green('\u2192')}  Railway or Render`);
      logger.info(`  ${chalk.dim('FastAPI')}    ${chalk.green('\u2192')}  Railway or Render`);
      logger.info('');
      logger.info(`  ${chalk.yellow('\u26A0')}  AI guide generation failed. Run ${chalk.cyan('ct deploy')} and choose "Deploy to Vercel" to deploy automatically.`);
      return { success: false, message: 'Deployment guide (fallback)' };
    }
  }

  if (action === 'history') {
    const depHistory = (project?.deploymentStatus as any)?.history || [];
    if (depHistory.length === 0) {
      logger.info('No deployments yet.');
      return { success: true, message: 'No deployment history' };
    }
    logger.info('Deployment History:');
    for (const dep of depHistory) {
      logger.bullet(`${dep.platform}: ${dep.url} (${dep.timestamp})`);
    }
    return { success: true, message: `Found ${depHistory.length} deployments` };
  }

  if (!project) {
    logger.warn('No active project. Run `ct init` first to set up project tracking.');
    const { proceed } = await inquirer.prompt([
      { type: 'confirm', name: 'proceed', message: 'Continue without project tracking?', default: true },
    ]);
    if (!proceed) return { success: false, message: 'Cancelled' };
  }

  const result = await vercelDeploy();

  if (result.success) {
    logger.success(`Deployed to ${result.url}`);
    if (project) {
      const depHistory: Array<{ platform: string; url: string; timestamp: string }> = (project.deploymentStatus as any)?.history || [];
      depHistory.push({ platform: result.platform, url: result.url, timestamp: new Date().toISOString() });
      state.updateProject({ deploymentStatus: { platform: result.platform, url: result.url, lastChecked: new Date().toISOString(), history: depHistory } as any });
    }
    return { success: true, message: `Deployed to ${result.url}`, data: { url: result.url } };
  }

  logger.error(`Deploy failed: ${result.error}`);
  return { success: false, message: result.error || 'Deployment failed' };
}
