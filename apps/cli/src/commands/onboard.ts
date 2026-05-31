import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { logger } from '../utils';
import { setLLMConfig, getLLMConfig } from '../utils/config';
import { PROVIDER_SETUP } from '../utils/api-error';
import { printActionHints, printHero } from '../utils/experience';
import { formatContextWindow, getModelsForProvider, getProviderProfile, PROVIDER_ORDER } from '../utils/provider-catalog';
import { promptConfirm, promptInput, promptSelect } from '../utils/prompt';

interface ProviderChoice {
  name: string;
  value: string;
  short: string;
}

const PROVIDER_CHOICES: ProviderChoice[] = PROVIDER_ORDER.map(provider => {
  const profile = getProviderProfile(provider)!;
  return {
    name: `${profile.name.padEnd(10, ' ')} — ${profile.bestFor}\n          ${profile.website}`,
    value: provider,
    short: profile.name,
  };
});

interface ModelChoice {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  pricing: string;
  recommended?: boolean;
}

const PROVIDER_MODELS: Record<string, ModelChoice[]> = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000, pricing: '$2.50/$10.00', recommended: true },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextWindow: 128000, pricing: '$0.15/$0.60' },
    { id: 'o4-mini', name: 'o4 Mini', provider: 'openai', contextWindow: 200000, pricing: 'Reasoning' },
    { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'openai', contextWindow: 128000, pricing: 'Check pricing' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic', contextWindow: 200000, pricing: '$3/$15', recommended: true },
    { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', provider: 'anthropic', contextWindow: 200000, pricing: '$0.80/$4.00' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'groq', contextWindow: 131072, pricing: 'Free', recommended: true },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'groq', contextWindow: 131072, pricing: 'Free' },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', provider: 'groq', contextWindow: 32768, pricing: 'Free' },
  ],
  nvidia: [
    { id: 'deepseek-ai/deepseek-v4-flash', name: 'DeepSeek V4 Flash', provider: 'nvidia', contextWindow: 131072, pricing: 'Free', recommended: true },
    { id: 'nvidia/llama-3.3-nemotron-super-49b-v1', name: 'Nemotron Super 49B', provider: 'nvidia', contextWindow: 128000, pricing: 'Free' },
    { id: 'meta/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'nvidia', contextWindow: 128000, pricing: 'Free' },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', contextWindow: 65536, pricing: '$0.27/$1.10', recommended: true },
    { id: 'deepseek-reasoner', name: 'DeepSeek R1', provider: 'deepseek', contextWindow: 65536, pricing: '$0.55/$2.19' },
  ],
  together: [
    { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B', provider: 'together', contextWindow: 131072, pricing: '$0.59/$0.59', recommended: true },
    { id: 'mistralai/Mixtral-8x22B-Instruct-v0.1', name: 'Mixtral 8x22B', provider: 'together', contextWindow: 65536, pricing: '$1.20/$1.20' },
  ],
  ollama: [
    { id: 'llama3.2', name: 'Llama 3.2 (default)', provider: 'ollama', contextWindow: 8192, pricing: 'Free', recommended: true },
    { id: 'mistral', name: 'Mistral', provider: 'ollama', contextWindow: 8192, pricing: 'Free' },
    { id: 'codellama', name: 'CodeLlama', provider: 'ollama', contextWindow: 16384, pricing: 'Free' },
  ],
  'local-server': [
    { id: 'local-model', name: 'Local Model (default)', provider: 'local-server', contextWindow: 8192, pricing: 'Free', recommended: true },
  ],
};

async function validateApiKey(provider: string, apiKey: string): Promise<string | null> {
  const setup = PROVIDER_SETUP[provider];
  if (!setup) return `Unknown provider: ${provider}`;

  // Local providers don't need API keys
  if (!setup.envVar) return null;

  if (!apiKey || apiKey.trim().length < 8) {
    return 'API key looks too short. Please check and try again.';
  }

  const baseURLs: Record<string, string> = {
    openai: 'https://api.openai.com/v1/models',
    anthropic: 'https://api.anthropic.com/v1/messages',
    groq: 'https://api.groq.com/openai/v1/models',
    nvidia: 'https://integrate.api.nvidia.com/v1/models',
    deepseek: 'https://api.deepseek.com/v1/models',
    together: 'https://api.together.ai/v1/models',
  };

  const url = baseURLs[provider];
  if (!url) return null; // skip validation for unknown providers

  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
    };
    if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      return null; // valid
    }
    if (res.status === 401 || res.status === 403) {
      return 'API key rejected (401/403). Please check your key and try again.';
    }
    if (res.status === 429) {
      return 'Rate limited. Wait a moment and try again, or check your quota.';
    }
    return `API returned status ${res.status}. Please verify your key.`;
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return 'Connection timed out. Check your internet or the provider URL.';
    }
    return `Connection error: ${e.message}`;
  }
}

export async function onboardCommand(reset?: boolean): Promise<CommandResult> {
  // Reset mode
  if (reset) {
    const { resetConfig } = await import('../utils/config');
    resetConfig();
    logger.success('Configuration reset.');
    if (process.stdin.isTTY && process.stdout.isTTY) {
      logger.info(`  ${chalk.hex('#899691')('Restarting guided setup...')}`);
      console.log('');
      return onboardCommand(false);
    }
    logger.info('Run ct onboard to start setup again.');
    return { success: true, message: 'Configuration reset' };
  }

  printHero(
    'Welcome to CodeThon CLI',
    'This setup connects an AI provider, verifies access, picks a default model, and gets the CLI ready for real work.',
    'setup',
    'First-run setup',
  );

  // Step 1: Choose provider
  const provider = await promptSelect({
    message: 'Choose an AI provider:',
    choices: PROVIDER_CHOICES,
  });

  const setup = PROVIDER_SETUP[provider];
  const needsKey = setup && setup.envVar;
  const profile = getProviderProfile(provider);

  if (profile) {
    console.log('');
    logger.labelValue('Provider', profile.name);
    logger.labelValue('Best For', profile.bestFor);
    logger.labelValue('Pricing', profile.pricingHint);
    logger.labelValue(profile.local ? 'Start Local Server' : 'Get API Key', profile.setupUrl);
    console.log('');
  }

  let apiKey = '';

  // Step 2: Collect API key (skip for local providers)
  if (needsKey) {
    const keyFromEnv = process.env[setup.envVar] || '';
    if (keyFromEnv) {
      const useEnv = await promptConfirm({
        message: `Found ${setup.envVar} in environment. Use it?`,
        defaultValue: true,
      });
      if (useEnv) {
        apiKey = keyFromEnv;
      }
    }

    // Validate key
    let validationError: string | null = 'initial';
    while (validationError !== null) {
      if (!apiKey) {
        apiKey = (await promptInput({
          message: `Enter your ${provider} API key`,
          password: true,
          validate: (value: string) => value.trim().length > 0 ? true : 'Please enter an API key',
        })).trim();
      }

      logger.info(`\n  ${chalk.hex('#899691')('Validating API key...')}`);
      validationError = await validateApiKey(provider, apiKey);

      if (validationError) {
        logger.error(`  ${validationError}`);
        logger.info(chalk.hex('#899691')(`  Get a key: ${setup.url}`));
        console.log('');
        apiKey = '';
        const retry = await promptConfirm({
          message: 'Try again?',
          defaultValue: true,
        });
        if (!retry) {
          logger.info('Onboarding cancelled. Run ct to restart setup.');
          return { success: false, message: 'Onboarding cancelled' };
        }
      }
    }
    logger.success('  Authentication successful');
  }

  // Step 3: Choose model
  const models = getModelsForProvider(provider).map(model => ({
    id: model.id,
    name: model.name,
    provider: model.provider,
    contextWindow: model.contextWindow,
    maxOutput: model.maxOutput,
    pricing: model.pricing,
    recommended: model.recommended,
  }));
  console.log('');
  const modelChoices = models.map(m => {
    const ctx = formatContextWindow(m.contextWindow);
    const price = m.pricing === 'Free' ? chalk.hex('#82f7a6')('Free') : chalk.hex('#899691')(m.pricing);
    const badge = m.recommended ? chalk.bgHex('#82f7a6').hex('#00110b')(' BEST ') : '';
    const name = m.recommended ? chalk.hex('#f7fff9').bold(m.name) : chalk.hex('#e0e6e1')(m.name);
    return {
      name: `  ${name}  ${chalk.hex('#899691')(`${ctx} ctx`)}  ${price} ${badge}`,
      value: m.id,
      short: m.name,
    };
  });

  const model = await promptSelect({
    message: 'Select a model:',
    choices: modelChoices,
  });
  const selectedModel = models.find(entry => entry.id === model);

  // Step 4: Save config
  setLLMConfig({
    provider: provider as any,
    model,
    temperature: 0.3,
    maxTokens: selectedModel?.maxOutput || 4096,
  });

  // Store key in env for the session and keychain for persistence
  if (needsKey && apiKey) {
    process.env[setup.envVar] = apiKey;
    try {
      const { storeSecret } = await import('../utils/keychain');
      await storeSecret(setup.envVar, apiKey);
    } catch { /* non-critical */ }
  }

  // Step 5: Run test request
  console.log('');
  logger.info(`  ${chalk.hex('#899691')('Running test request...')}`);
  try {
    const { createProvider } = await import('../llm/providers/index');
    const llm = getLLMConfig();
    const prov = createProvider({
      provider: provider as any,
      modelId: model,
      apiKey: apiKey || undefined,
      temperature: 0.1,
      maxTokens: 100,
    });
    const res = await prov.generate({
      messages: [{ role: 'user', content: 'Say "Hello from CodeThon CLI!" and nothing else.' }],
      temperature: 0.1,
      maxTokens: 100,
    });
    if (res.content) {
      logger.success('  Model verified');
      console.log(`    ${chalk.hex('#899691')(res.content.slice(0, 100))}`);
    }
  } catch {
    logger.warn('  Test request failed. Your config is saved, but check connectivity.');
  }

  // Step 6: Mark complete
  const { saveOnboardingComplete } = await import('../features/onboarding');
  saveOnboardingComplete({
    provider,
    model,
    apiKeySet: needsKey ? true : false,
  });

  console.log('');
  logger.success('Configuration saved');
  printActionHints('Suggested next actions', [
    { command: 'init', description: 'Set up a project workspace or describe the one you want to build.' },
    { command: 'plan', description: 'Generate a roadmap and architecture before writing code.' },
    { command: 'execute "<goal>"', description: 'Give the agent a concrete task to work on.' },
    { command: 'doctor', description: 'Run diagnostics if you want a full health check before starting.' },
  ], '/');
  console.log('');
  logger.info(`  ${chalk.hex('#899691')('You can reopen the interactive REPL anytime with')} ${chalk.hex('#74d7ff')('ct')}${chalk.hex('#899691')('.')}`);

  return { success: true, message: 'Onboarding complete' };
}
