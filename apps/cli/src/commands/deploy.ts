import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { spawnSync } from 'child_process';
import type { CommandResult } from '@codethon/shared-types';
import { createSpinner, logger } from '../utils';
import { StateManager } from '../cil/state-manager';
import { sanitizeEnv, resolveBin } from '../utils/env';
import { formatApiError, isAuthError } from '../utils/api-error';

interface DeployResult {
  platform: string;
  url: string;
  success: boolean;
  error?: string;
}

function findProjectRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function spawnSafe(bin: string, args: string[], opts: { timeout?: number; cwd?: string; stdio?: 'pipe' | 'inherit' } = {}): ReturnType<typeof spawnSync> {
  let spawnBin: string;
  try {
    spawnBin = resolveBin(bin);
  } catch {
    spawnBin = bin;
  }
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
  const projectDir = findProjectRoot();
  logger.info(`Project root: ${chalk.cyan(projectDir)}`);

  // Check if Vercel CLI is available
  let vercelCheck = null;
  try {
    vercelCheck = spawnSafe('npx', ['vercel', '--version'], { timeout: 15000 });
  } catch { /* will install */ }

  if (!vercelCheck || vercelCheck.error || vercelCheck.status !== 0) {
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
    const installResult = spawnSafe('npx', ['@vercel/cli', '--version'], { timeout: 60000 });
    if (installResult.error || installResult.status !== 0) {
      installSpinner.fail('Failed to install Vercel CLI');
      return { platform: 'Vercel', url: '', success: false, error: 'Failed to install Vercel CLI' };
    }
    installSpinner.succeed('Vercel CLI ready');
  }

  // Check for build script and optionally build
  const pkgPath = path.join(projectDir, 'package.json');
  let hasBuildScript = false;
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      hasBuildScript = !!(pkg.scripts && pkg.scripts.build);
    } catch { /* ignore */ }
  }

  if (hasBuildScript) {
    const { build } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'build',
        message: 'Run npm run build before deploying?',
        default: true,
      },
    ]);

    if (build) {
      const buildSpinner = createSpinner('Building project for production...');
      buildSpinner.start();
      const buildResult = spawnSafe('npm', ['run', 'build'], { cwd: projectDir, timeout: 120000 });
      if (buildResult.error || buildResult.status !== 0) {
        buildSpinner.fail('Build failed');
        return { platform: 'Vercel', url: '', success: false, error: (buildResult.stderr as string)?.slice(0, 500) || 'Build failed' };
      }
      buildSpinner.succeed('Build complete');
    }
  }

  const deploySpinner = createSpinner('Deploying to Vercel...');
  deploySpinner.start();

  const deployArgs = ['vercel', '--prod', '--yes'];
  if (process.env.VERCEL_TOKEN) {
    deployArgs.push('--token', process.env.VERCEL_TOKEN);
  }

  const deployResult = spawnSafe('npx', deployArgs, { cwd: projectDir, timeout: 180000 });

  if (deployResult.error || deployResult.status !== 0) {
    deploySpinner.fail('Deployment failed');
    const errorMsg = (deployResult.stderr as string)?.slice(0, 500) || (deployResult.stdout as string)?.slice(0, 500) || 'Deployment failed';
    if (errorMsg.includes('not authenticated') || errorMsg.includes('login') || errorMsg.includes('Error: The specified token was not found')) {
      logger.info('');
      logger.info('No valid Vercel token found. Trying interactive authentication...');
      const interactiveResult = spawnSafe('npx', ['vercel', '--prod'], { cwd: projectDir, timeout: 180000, stdio: 'inherit' });
      if (interactiveResult.status != null && interactiveResult.status === 0) {
        deploySpinner.succeed('Deployment complete!');
        const urlMatch = (interactiveResult.stdout as string)?.match(/https:\/\/[^\s]+\.vercel\.app/);
        const url = urlMatch?.[0] || 'https://[your-project].vercel.app';
        return { platform: 'Vercel', url, success: true };
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
    } catch (e: any) {
      spinner.fail('AI guide unavailable');
      const errMsg = e.message || String(e);
      if (isAuthError(e)) {
        logger.error(formatApiError(e));
      } else {
        logger.error(`AI service error: ${errMsg}`);
      }
      logger.info('');
      logger.info(chalk.bold.cyan('  No AI? Here are recommended platforms:'));
      logger.info('');
      logger.info(`  ${chalk.dim('Next.js')}    ${chalk.green('→')}  Vercel (zero-config)`);
      logger.info(`  ${chalk.dim('Vite/React')}  ${chalk.green('→')}  Vercel or Netlify`);
      logger.info(`  ${chalk.dim('Express')}    ${chalk.green('→')}  Railway or Render`);
      logger.info(`  ${chalk.dim('FastAPI')}    ${chalk.green('→')}  Railway or Render`);
      logger.info('');
      logger.info(`  ${chalk.yellow('⚠')}  AI guide generation failed. Run ${chalk.cyan('ct deploy')} and choose "Deploy to Vercel" to deploy automatically.`);
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
