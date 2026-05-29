import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import type { CommandResult } from '@codethon/shared-types';
import { OnboardingWizard } from '../features/onboarding';
import { logger } from '../utils';
import { hasAnyApiKey } from '../utils/api-error';

export async function onboardCommand(): Promise<CommandResult> {
  const wizard = new OnboardingWizard();

  if (wizard.isComplete() && hasAnyApiKey()) {
    const step = wizard.currentStep();
    logger.info(`Setup already complete (step ${step})`);
    logger.info(`Run ${chalk.cyanBright('/model')} to change AI models`);
    logger.info(`Run ${chalk.cyanBright('/onboard --reset')} to re-run setup`);
    return { success: true, message: 'Already onboarded' };
  }

  logger.section('CodeThon Setup');
  console.log('');
  logger.info('Checking your environment...');

  // Check available API keys
  const keyChecks = [
    { name: 'NVIDIA (FREE)', env: 'NVIDIA_API_KEY', url: 'https://build.nvidia.com' },
    { name: 'Groq (FREE)', env: 'GROQ_API_KEY', url: 'https://console.groq.com/keys' },
    { name: 'OpenAI', env: 'OPENAI_API_KEY', url: 'https://platform.openai.com/api-keys' },
    { name: 'Anthropic', env: 'ANTHROPIC_API_KEY', url: 'https://console.anthropic.com/settings/keys' },
    { name: 'DeepSeek', env: 'DEEPSEEK_API_KEY', url: 'https://platform.deepseek.com/api_keys' },
    { name: 'Together AI', env: 'TOGETHER_API_KEY', url: 'https://api.together.ai/settings/api-keys' },
  ];

  const found: string[] = [];
  const missing: string[] = [];

  for (const k of keyChecks) {
    if (process.env[k.env]) {
      found.push(k.env);
      logger.info(`  ${chalk.greenBright('\u2713')} ${k.name} ${chalk.dim('(' + k.env + ' is set)')}`);
    } else {
      missing.push(k.env);
      logger.info(`  ${chalk.dim('\u25CB')} ${k.name} — ${chalk.yellowBright(k.env)} not set`);
      logger.info(`    ${chalk.dim('Get a key:')} ${chalk.cyanBright(k.url)}`);
    }
  }

  // Check local models
  const hasOllama = await checkLocalServer('http://localhost:11434');
  const hasLmStudio = await checkLocalServer('http://localhost:1234');
  if (hasOllama) logger.info(`  ${chalk.greenBright('\u2713')} Ollama ${chalk.dim('(running on localhost:11434)')}`);
  if (hasLmStudio) logger.info(`  ${chalk.greenBright('\u2713')} LM Studio ${chalk.dim('(running on localhost:1234)')}`);
  if (!hasOllama && !hasLmStudio && found.length === 0 && missing.length === keyChecks.length) {
    logger.info(`  ${chalk.dim('\u25CB')} No API keys or local servers found`);
    logger.info(`    ${chalk.dim('Get a free NVIDIA API key:')} ${chalk.cyanBright('https://build.nvidia.com')}`);
    logger.info(`    ${chalk.dim('Or install Ollama:')} ${chalk.cyanBright('https://ollama.ai')}`);
    logger.info(`    ${chalk.dim('Or get a free Groq API key:')} ${chalk.cyanBright('https://console.groq.com/keys')}`);
  }

  // Show which commands work without AI
  if (found.length === 0 && !hasOllama && !hasLmStudio) {
    console.log('');
    logger.info(chalk.bold('Set an API key now:'));
    for (const k of keyChecks) {
      logger.info(`  ${chalk.cyanBright(`$env:${k.env}="<your-key>"`)}  ${chalk.dim(`(PowerShell)`)}`);
      logger.info(`  ${chalk.cyanBright(`set ${k.env}=<your-key>`)}        ${chalk.dim(`(CMD)`)}`);
      logger.info(`  ${chalk.dim(`Get key:`)} ${chalk.cyanBright(k.url)}`);
      logger.info('');
    }
    console.log('');
    logger.info(chalk.bold('Commands that work without an API key:'));
    logger.info(`  ${chalk.cyanBright('ct init')}      ${chalk.dim('- Configure your project')}`);
    logger.info(`  ${chalk.cyanBright('ct model')}     ${chalk.dim('- Switch AI models/providers')}`);
    logger.info(`  ${chalk.cyanBright('ct scaffold')}  ${chalk.dim('- Generate project template files')}`);
    logger.info(`  ${chalk.cyanBright('ct doctor')}    ${chalk.dim('- System diagnostics (Node, TS, configs)')}`);
    logger.info(`  ${chalk.cyanBright('ct status')}    ${chalk.dim('- View project config and health')}`);
    logger.info(`  ${chalk.cyanBright('ct deploy')}    ${chalk.dim('- Deploy to Vercel')}`);
    logger.info(`  ${chalk.cyanBright('ct review')}    ${chalk.dim('- Git diff review')}`);
  }

  // Create .codethon config dir
  const configDir = path.join(os.homedir(), '.codethon');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Save onboarding state
  const statePath = path.join(configDir, 'onboarding.json');
  const state = {
    completed: true,
    step: 5,
    modelConfigured: found.length > 0,
    apiKeysSet: found,
    projectCreated: false,
    theme: 'dark',
  };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

  console.log('');
  logger.success('Setup complete!');
  console.log('');
  logger.info(chalk.bold('Quick start:'));
  logger.info(`  ${chalk.cyanBright('/plan --feature "my idea"')}  ${chalk.dim('Design your project')}`);
  logger.info(`  ${chalk.cyanBright('/scaffold')}          ${chalk.dim('Generate starter files')}`);
  logger.info(`  ${chalk.cyanBright('/execute "build it"')} ${chalk.dim('Let the AI build it')}`);
  logger.info('');
  logger.info(`Need help? ${chalk.dim('Type /help for all commands or /learn to ask anything')}`);

  return { success: true, message: 'Onboarding complete' };

  async function checkLocalServer(url: string): Promise<boolean> {
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
        return res.ok;
      }
    } catch { /* not running */ }
    return false;
  }
}
