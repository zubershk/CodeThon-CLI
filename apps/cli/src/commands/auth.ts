import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { getLLMConfig, setLLMConfig } from '../utils/config';
import { PROVIDER_SETUP } from '../utils/api-error';
import { logger } from '../utils';
import { printActionHints, printHero } from '../utils/experience';
import { formatContextWindow, getModelsForProvider, getProviderDisplayName, getProviderProfile, hasProviderCredential, PROVIDER_ORDER } from '../utils/provider-catalog';
import { promptConfirm, promptInput, promptSelect } from '../utils/prompt';

const ALL_PROVIDERS = PROVIDER_ORDER.map(provider => {
  const profile = getProviderProfile(provider)!;
  return { name: profile.name, value: provider, url: profile.setupUrl };
});

async function validateApiKey(provider: string, apiKey: string): Promise<string | null> {
  const setup = PROVIDER_SETUP[provider];
  if (!setup) return 'Unknown provider';
  if (!setup.envVar) return null;

  if (!apiKey || apiKey.trim().length < 8) return 'API key too short.';

  const urls: Record<string, string> = {
    openai: 'https://api.openai.com/v1/models',
    anthropic: 'https://api.anthropic.com/v1/messages',
    groq: 'https://api.groq.com/openai/v1/models',
    nvidia: 'https://integrate.api.nvidia.com/v1/models',
    deepseek: 'https://api.deepseek.com/v1/models',
    together: 'https://api.together.ai/v1/models',
  };
  const url = urls[provider];
  if (!url) return null;

  try {
    const headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}` };
    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (res.ok) return null;
    if (res.status === 401 || res.status === 403) return 'API key rejected (401/403).';
    if (res.status === 429) return 'Rate limited. Check quota and try again.';
    return `API responded with status ${res.status}.`;
  } catch (e: any) {
    if (e.name === 'AbortError') return 'Connection timed out.';
    return `Error: ${e.message}`;
  }
}

export async function authAddCommand(): Promise<CommandResult> {
  printHero(
    'Connect a Provider',
    'CodeThon can use hosted providers or local model servers. Pick one, validate access, then choose a default model.',
    'setup',
    'Authentication',
  );

  const provider = await promptSelect({
    message: 'Choose a provider to configure:',
    choices: ALL_PROVIDERS.map(p => ({
      name: `  ${p.name}`,
      value: p.value,
    })),
  });

  const setup = PROVIDER_SETUP[provider];
  const profile = getProviderProfile(provider);
  if (!setup) {
    logger.error('Unknown provider.');
    return { success: false, message: 'Unknown provider' };
  }

  if (profile) {
    console.log('');
    logger.labelValue('Provider', profile.name);
    logger.labelValue('Best For', profile.bestFor);
    logger.labelValue('Pricing', profile.pricingHint);
    logger.labelValue('Website', profile.website);
    logger.labelValue(profile.local ? 'Get Started' : 'Get API Key', profile.setupUrl);
    console.log('');
  }

  let apiKey = '';

  if (setup.envVar) {
    const envExisting = process.env[setup.envVar] || '';
    if (envExisting) {
      const useEnv = await promptConfirm({
        message: `Use ${setup.envVar} from environment?`,
        defaultValue: true,
      });
      if (useEnv) {
        apiKey = envExisting;
      }
    }

    while (true) {
      if (!apiKey) {
        apiKey = (await promptInput({
          message: `Enter ${provider} API key`,
          password: true,
          validate: (value: string) => value.trim().length > 0 ? true : 'Please enter an API key',
        })).trim();
      }

      logger.info(`  ${chalk.dim('Validating...')}`);
      const err = await validateApiKey(provider, apiKey);
      if (err) {
        logger.error(`  ${err}`);
        logger.info(`  ${chalk.dim(`Get key: ${setup.url}`)}`);
        console.log('');
        apiKey = '';
        const retry = await promptConfirm({ message: 'Try again?', defaultValue: true });
        if (!retry) return { success: false, message: 'Cancelled' };
        continue;
      }
      break;
    }

    process.env[setup.envVar] = apiKey;
    try {
      const { storeSecret } = await import('../utils/keychain');
      await storeSecret(setup.envVar, apiKey);
    } catch { /* non-critical */ }
    logger.success('  API key valid');
  } else {
    logger.info(`  ${chalk.dim('Local provider — no API key needed.')}`);
  }

  const models = getModelsForProvider(provider);
  const model = await promptSelect({
    message: 'Choose the default model for this provider:',
    choices: models.map(entry => ({
      name: `  ${entry.name}  ${chalk.dim(`${formatContextWindow(entry.contextWindow)} ctx`)}  ${entry.pricing === 'Free' ? chalk.green('Free') : chalk.dim(entry.pricing)}${entry.recommended ? ` ${chalk.bgGreen.black(' BEST ')}` : ''}`,
      value: entry.id,
    })),
  });

  const pickedModel = models.find(entry => entry.id === model);
  setLLMConfig({
    provider: provider as any,
    model,
    maxTokens: pickedModel?.maxOutput,
    temperature: 0.3,
  });

  logger.success(`  Provider set to ${getProviderDisplayName(provider)}`);
  if (pickedModel) {
    logger.info(`  Default model: ${chalk.bold(pickedModel.name)}`);
  }

  printActionHints('Suggested next actions', [
    { command: 'status', description: 'Review the active provider, model, and project state.' },
    { command: 'doctor', description: 'Run a full environment check before your first agent task.' },
    { command: 'plan', description: 'Start turning an idea into a roadmap.' },
  ], '/');

  return { success: true, message: `Provider ${provider} configured` };
}

export async function authListCommand(): Promise<CommandResult> {
  const config = getLLMConfig();
  const activeProvider = config.provider;
  const activeModel = config.model || 'Not set';
  const providerReady = Boolean(config.apiKey) || config.provider === 'ollama' || config.provider === 'local-server';

  printHero(
    'Provider Overview',
    providerReady ? 'Your AI connection is ready. You can switch models or jump back into planning and execution.' : 'A provider is selected, but credentials are still missing.',
    providerReady ? 'ready' : 'setup',
    providerReady ? 'AI ready' : 'Setup needed',
  );

  const configured: string[] = [];
  for (const p of ALL_PROVIDERS) {
    const setup = PROVIDER_SETUP[p.value];
    if (!setup) continue;
    if (!setup.envVar) {
      if (p.value === activeProvider) configured.push(p.value);
    } else if (process.env[setup.envVar]) {
      configured.push(p.value);
    }
  }

  if (configured.length === 0) {
    logger.info('  No providers configured.');
    logger.info(`  Active selection: ${getProviderDisplayName(activeProvider)}${activeModel ? ` · ${activeModel}` : ''}`);
    logger.info(`  ${chalk.dim('Run')} ${chalk.cyanBright('ct auth add')} ${chalk.dim('to set one up.')}`);
    return { success: true, message: 'No providers configured' };
  }

  for (const p of ALL_PROVIDERS) {
    const isActive = p.value === activeProvider;
    const setup = PROVIDER_SETUP[p.value];
    const isLocal = !setup?.envVar;
    const hasKey = hasProviderCredential(p.value);
    if ((hasKey && !isLocal) || isActive) {
      const active = isActive ? chalk.green(' (active)') : '';
      const keyStatus = isLocal
        ? chalk.yellow('\u25CE')
        : hasKey
          ? chalk.green('\u2713')
          : chalk.red('\u2717');
      logger.info(`  ${keyStatus} ${getProviderDisplayName(p.value)}${active}`);
    }
  }

  console.log('');
  logger.labelValue('Active Provider', getProviderDisplayName(activeProvider));
  logger.labelValue('Active Model', activeModel);
  printActionHints('Suggested next actions', [
    { command: 'model', description: 'Switch to another model without changing providers.' },
    { command: 'auth test', description: 'Verify your current provider responds before a long run.' },
    { command: 'execute "<goal>"', description: 'Run the autonomous agent against a clear task.' },
  ], '/');

  return { success: true, message: `Active: ${activeProvider}` };
}

export async function authTestCommand(providerArg?: string): Promise<CommandResult> {
  const config = getLLMConfig();
  const target = providerArg || config.provider;
  const setup = PROVIDER_SETUP[target];

  if (!setup) {
    logger.error(`Unknown provider: ${target}`);
    return { success: false, message: `Unknown provider: ${target}` };
  }

  logger.section(`Testing ${target}`);

  if (!setup.envVar) {
    logger.info(`  ${chalk.yellow('\u26A0')} Local providers require a running server.`);
    return { success: true, message: `Test skipped for ${target}` };
  }

  const apiKey = process.env[setup.envVar] || config.apiKey;
  if (!apiKey) {
    logger.error(`  No API key found for ${target}.`);
    logger.info(`  ${chalk.dim('Run')} ${chalk.cyanBright('ct auth add')} ${chalk.dim('to configure.')}`);
    return { success: false, message: 'No API key' };
  }

  // Test latency
  const start = Date.now();
  const err = await validateApiKey(target, apiKey);
  const latency = Date.now() - start;

  if (err) {
    logger.error(`  ${chalk.red('\u2717')} Authentication: FAILED`);
    logger.info(`  ${chalk.dim('Latency:')} ${latency}ms`);
    logger.info(`  ${chalk.dim('Error:')} ${err}`);
    return { success: false, message: `Auth failed: ${err}` };
  }

  logger.success(`  ${chalk.green('\u2713')} Authentication: OK`);
  logger.info(`  ${chalk.dim('Latency:')} ${latency}ms`);
  logger.info(`  ${chalk.dim('Model:')} ${config.model || 'default'}`);

  return { success: true, message: `${target} is working (${latency}ms)` };
}

export async function authSwitchCommand(): Promise<CommandResult> {
  const config = getLLMConfig();

  const choices = ALL_PROVIDERS.map(p => {
    const setup = PROVIDER_SETUP[p.value];
    const hasKey = setup?.envVar ? !!process.env[setup.envVar] : true;
    const isActive = p.value === config.provider;
    const keyIcon = hasKey ? chalk.green('\u2713') : chalk.dim('\u25CB');
    const activeLabel = isActive ? chalk.green(' (active)') : '';
    return { name: `  ${keyIcon} ${p.name}${activeLabel}`, value: p.value };
  });

  const provider = await promptSelect({
    message: 'Switch provider:',
    choices,
  });

  setLLMConfig({ provider: provider as any });
  logger.success(`Switched to ${getProviderDisplayName(provider)}`);

  const setup = PROVIDER_SETUP[provider];
  if (setup?.envVar && !process.env[setup.envVar]) {
    logger.warn(`  ${setup.envVar} is not set. Run ${chalk.cyanBright('ct auth add')} to provide a key.`);
  }

  return { success: true, message: `Switched to ${provider}` };
}

export async function authRemoveCommand(providerArg?: string): Promise<CommandResult> {
  const config = getLLMConfig();
  let target = providerArg;

  if (!target) {
    const raw: { name: string; value: string }[] = [];
    for (const p of ALL_PROVIDERS) {
      const setup = PROVIDER_SETUP[p.value];
      const hasKey = setup?.envVar ? !!process.env[setup.envVar] : false;
      if (hasKey || p.value === config.provider) {
        const isActive = p.value === config.provider ? ' (active)' : '';
        raw.push({ name: `  ${p.value}${isActive}`, value: p.value });
      }
    }

    if (raw.length === 0) {
      logger.info('No configured providers to remove.');
      return { success: true, message: 'Nothing to remove' };
    }

    target = await promptSelect({
      message: 'Remove provider:',
      choices: raw,
    });
  }

  // Can't unset env vars, just inform
  const setup = PROVIDER_SETUP[target!];
  if (setup?.envVar) {
    try {
      const { removeSecret } = await import('../utils/keychain');
      await removeSecret(setup.envVar);
    } catch { /* best effort */ }
    delete process.env[setup.envVar];
    logger.info(`  Removed the stored credential for ${target}.`);
    logger.info(`  If you also exported ${setup.envVar} in your shell profile, remove it there as well.`);
    logger.info(`  ${chalk.dim('PowerShell:')} ${chalk.cyanBright(`Remove-Item Env:${setup.envVar}`)}`);
    logger.info(`  ${chalk.dim('CMD:')} ${chalk.cyanBright(`set ${setup.envVar}=`)}`);

    if (config.provider === target) {
      const remaining = ALL_PROVIDERS.filter(p => {
        const s = PROVIDER_SETUP[p.value];
        if (p.value === target) return false;
        return s?.envVar ? !!process.env[s.envVar] : true;
      });
      if (remaining.length > 0) {
        setLLMConfig({ provider: remaining[0].value as any });
        logger.info(`  Switched active provider to ${remaining[0].value}.`);
      } else {
        logger.warn('  No other providers configured. Run ct onboard to set one up.');
      }
    }
  }

  return { success: true, message: `${target} removed` };
}

export async function authLogoutCommand(): Promise<CommandResult> {
  const { resetConfig } = await import('../utils/config');
  resetConfig();
  try {
    const { clearAllSecrets } = await import('../utils/keychain');
    await clearAllSecrets();
  } catch { /* non-critical */ }
  logger.success('All credentials and configuration cleared.');
  logger.info(`  ${chalk.dim('Run')} ${chalk.cyanBright('ct')} ${chalk.dim('to restart setup.')}`);
  return { success: true, message: 'Logged out' };
}
