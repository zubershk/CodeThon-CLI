import chalk from 'chalk';
import type { CommandResult, ModelInfo, ProviderType } from '@codethon/shared-types';
import { AVAILABLE_MODELS } from '@codethon/shared-types';
import { logger } from '../utils';
import { setLLMConfig } from '../utils/config';
import { PROVIDER_SETUP } from '../utils/api-error';
import { printActionHints, printHero } from '../utils/experience';
import { formatContextWindow, getProviderDisplayName, hasProviderCredential } from '../utils/provider-catalog';
import { promptConfirm, promptSelect } from '../utils/prompt';

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq (FREE)',
  nvidia: 'NVIDIA (Free tier)',
  deepseek: 'DeepSeek',
  together: 'Together AI',
  ollama: 'Ollama (Local)',
  'local-server': 'LM Studio (Local)',
};

function formatModelEntry(m: ModelInfo): string {
  const ctxLabel = m.contextWindow >= 1000000
    ? `${(m.contextWindow / 1000000).toFixed(1)}M`
    : m.contextWindow >= 1000
      ? `${(m.contextWindow / 1000).toFixed(0)}K`
      : `${m.contextWindow}`;
  const badge = m.recommended ? chalk.bgGreen.black(' BEST ') : '';
  const price = m.pricing === 'Free' ? chalk.green('Free') : chalk.dim(m.pricing);
  return `${chalk.bold(m.name)}  ${chalk.dim(`${ctxLabel} ctx`)}  ${price} ${badge}`;
}

export async function modelCommand(): Promise<CommandResult> {
  printHero(
    'Choose a Model',
    'Switch the default model used by CodeThon agents. This changes both the provider and the model when needed.',
    'ready',
    'Model selection',
  );

  // Group models by provider
  const providers = [...new Set(AVAILABLE_MODELS.map(m => m.provider))];
  const modelChoices: any[] = [];

  for (const p of providers) {
    const label = PROVIDER_LABELS[p] || p;
    const hasKey = hasProviderCredential(p);
    const keyIcon = hasKey ? chalk.green('\u2713') : chalk.dim('\u25CB');
    modelChoices.push({ separator: chalk.magenta(`${keyIcon} ${label}`) });
    const models = AVAILABLE_MODELS.filter(m => m.provider === p);
    for (const m of models) {
      modelChoices.push({ name: `  ${formatModelEntry(m)}`, value: m.id });
    }
  }

  const selectedModel = await promptSelect<string>({
    message: 'Select a model:',
    choices: modelChoices,
  });

  const modelInfo = AVAILABLE_MODELS.find((m) => m.id === selectedModel);
  if (!modelInfo) {
    logger.error('Invalid model selection.');
    return { success: false, message: 'Invalid model selection' };
  }

  const provider: ProviderType = modelInfo.provider;
  const setup = PROVIDER_SETUP[provider];
  if (setup?.envVar && !process.env[setup.envVar]) {
    logger.warn(`${getProviderDisplayName(provider)} is not configured yet.`);
    logger.info(`Run ${chalk.cyanBright('ct auth add')} to save ${chalk.yellowBright(setup.envVar)} before using this model.`);
    const switchAnyway = await promptConfirm({
      message: 'Switch to this model anyway?',
      defaultValue: false,
    });
    if (!switchAnyway) {
      return { success: false, message: 'Model switch cancelled because provider credentials are missing' };
    }
  }

  setLLMConfig({
    provider,
    model: selectedModel,
    temperature: 0.3,
    maxTokens: modelInfo.maxOutput,
  });

  logger.section('Model Updated');
  logger.labelValue('Model', `${chalk.bold(modelInfo.name)}`);
  logger.labelValue('Provider', getProviderDisplayName(provider));
  logger.labelValue('Context', `${formatContextWindow(modelInfo.contextWindow)} tokens`);
  logger.labelValue('Max Output', `${(modelInfo.maxOutput / 1024).toFixed(1)}K tokens`);
  logger.labelValue('Pricing', modelInfo.pricing === 'Free' ? chalk.green('Free') : modelInfo.pricing);

  if (setup?.envVar && !process.env[setup.envVar]) {
    logger.divider();
    logger.info(`  ${chalk.dim('Note:')} Set ${chalk.yellowBright(setup.envVar)} in your environment or run ${chalk.cyanBright('ct auth add')}.`);
  }

  printActionHints('Suggested next actions', [
    { command: 'auth test', description: 'Verify the provider responds before a long agent run.' },
    { command: 'status', description: 'Confirm the active provider, model, and current project state.' },
    { command: 'execute "<goal>"', description: 'Start an agent run with the new model.' },
  ], '/');

  return {
    success: true,
    message: `Model switched to ${modelInfo.name}`,
    data: { model: selectedModel, provider },
  };
}
