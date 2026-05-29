import inquirer from 'inquirer';
import chalk from 'chalk';
import type { CommandResult, ModelInfo, ProviderType } from '@codethon/shared-types';
import { AVAILABLE_MODELS } from '@codethon/shared-types';
import { logger, labelValue } from '../utils';
import { setLLMConfig } from '../utils/config';

function formatModelEntry(m: ModelInfo): string {
  const ctxLabel = m.contextWindow >= 1000000
    ? `${(m.contextWindow / 1000000).toFixed(1)}M`
    : m.contextWindow >= 1000
      ? `${(m.contextWindow / 1000).toFixed(0)}K`
      : `${m.contextWindow}`;
  const badge = m.recommended ? chalk.bgGreen.black(' BEST ') : '';
  const tag = m.provider === 'nvidia' ? chalk.magenta('[NV]') : chalk.cyan('[OA]');
  const price = m.pricing === 'Free' ? chalk.green('Free') : chalk.dim(m.pricing);
  return `${chalk.bold(m.name)}  ${chalk.dim(`${ctxLabel} ctx`)}  ${price} ${badge} ${tag}`;
}

export async function modelCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Model Selection');
  logger.info('Switch the AI model powering your agents.');
  logger.divider();

  const openaiModels = AVAILABLE_MODELS.filter((m) => m.provider === 'openai');
  const nvidiaModels = AVAILABLE_MODELS.filter((m) => m.provider === 'nvidia');

  const modelChoices = [
    new inquirer.Separator(chalk.cyan('── OpenAI ──')),
    ...openaiModels.map((m) => ({
      name: `  ${formatModelEntry(m)}`,
      value: m.id,
    })),
    new inquirer.Separator(chalk.magenta('── NVIDIA (Free tier, set NVIDIA_API_KEY) ──')),
    ...nvidiaModels.map((m) => ({
      name: `  ${formatModelEntry(m)}`,
      value: m.id,
    })),
  ];

  const { selectedModel } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedModel',
      message: 'Select a model:',
      pageSize: 18,
      choices: modelChoices,
    },
  ]);

  const allModels = [...openaiModels, ...nvidiaModels];
  const modelInfo = allModels.find((m) => m.id === selectedModel);
  if (!modelInfo) {
    logger.error('Invalid model selection.');
    return { success: false, message: 'Invalid model selection' };
  }

  const provider: ProviderType = modelInfo.provider;
  setLLMConfig({
    provider,
    model: selectedModel,
    temperature: 0.3,
    maxTokens: modelInfo.maxOutput,
  });

  logger.section('Model Updated');
  const ctxLabel = modelInfo.contextWindow >= 1000
    ? `${(modelInfo.contextWindow / 1000).toFixed(0)}K`
    : `${modelInfo.contextWindow}`;
  logger.labelValue('Model', `${chalk.bold(modelInfo.name)}`);
  logger.labelValue('Context', `${ctxLabel} tokens`);
  logger.labelValue('Max Output', `${(modelInfo.maxOutput / 1024).toFixed(1)}K tokens`);
  logger.labelValue('Pricing', modelInfo.pricing === 'Free' ? chalk.green('Free') : modelInfo.pricing);
  logger.divider();

  const envHint = modelInfo.provider === 'nvidia'
    ? chalk.magenta('NVIDIA: Set NVIDIA_API_KEY (free tier at https://build.nvidia.com)')
    : chalk.cyan('OpenAI: Set OPENAI_API_KEY or CODETHON_OPENAI_KEY in .env');

  logger.info(`  ${chalk.dim('\u25B8')} ${envHint}`);

  return {
    success: true,
    message: `Model switched to ${modelInfo.name}`,
    data: { model: selectedModel, provider },
  };
}
