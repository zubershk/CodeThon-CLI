import type { ModelInfo, ProviderType } from '@codethon/shared-types';
import { AVAILABLE_MODELS } from '@codethon/shared-types';
import { PROVIDER_SETUP } from './api-error';

export interface ProviderProfile {
  id: ProviderType;
  name: string;
  website: string;
  setupUrl: string;
  bestFor: string;
  pricingHint: string;
  contextHint: string;
  local?: boolean;
}

export const PROVIDER_ORDER: ProviderType[] = [
  'openai',
  'anthropic',
  'groq',
  'nvidia',
  'deepseek',
  'together',
  'ollama',
  'local-server',
];

export const PROVIDER_PROFILES: Record<ProviderType, ProviderProfile> = {
  openai: {
    id: 'openai',
    name: 'OpenAI',
    website: 'https://platform.openai.com',
    setupUrl: 'https://platform.openai.com/api-keys',
    bestFor: 'Strong coding, tool use, and reliable general-purpose execution.',
    pricingHint: 'Paid API usage.',
    contextHint: 'Up to 200K context, depending on model.',
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    website: 'https://console.anthropic.com',
    setupUrl: 'https://console.anthropic.com/settings/keys',
    bestFor: 'Long context, careful reasoning, and doc-heavy workflows.',
    pricingHint: 'Paid API usage.',
    contextHint: 'Up to 200K context.',
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    website: 'https://console.groq.com',
    setupUrl: 'https://console.groq.com/keys',
    bestFor: 'Fast inference and low-friction prototyping.',
    pricingHint: 'Free tier available.',
    contextHint: 'Large context on supported open models.',
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA',
    website: 'https://build.nvidia.com',
    setupUrl: 'https://build.nvidia.com',
    bestFor: 'Free open-model access with strong coding options.',
    pricingHint: 'Free tier available.',
    contextHint: 'Large context on selected hosted models.',
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    website: 'https://platform.deepseek.com',
    setupUrl: 'https://platform.deepseek.com/api_keys',
    bestFor: 'Reasoning-heavy tasks at a competitive price point.',
    pricingHint: 'Paid API usage.',
    contextHint: 'Mid-size context windows.',
  },
  together: {
    id: 'together',
    name: 'Together AI',
    website: 'https://api.together.ai',
    setupUrl: 'https://api.together.ai/settings/api-keys',
    bestFor: 'Broad open-model catalog with hosted inference.',
    pricingHint: 'Paid API usage.',
    contextHint: 'Large context on selected turbo models.',
  },
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    website: 'https://ollama.ai',
    setupUrl: 'https://ollama.ai',
    bestFor: 'Private local runs on your own machine.',
    pricingHint: 'Free local runtime.',
    contextHint: 'Depends on your local model.',
    local: true,
  },
  'local-server': {
    id: 'local-server',
    name: 'LM Studio',
    website: 'https://lmstudio.ai',
    setupUrl: 'https://lmstudio.ai',
    bestFor: 'OpenAI-compatible local server workflows.',
    pricingHint: 'Free local runtime.',
    contextHint: 'Depends on your local model.',
    local: true,
  },
};

export function getProviderProfile(provider: string): ProviderProfile | undefined {
  return PROVIDER_PROFILES[provider as ProviderType];
}

export function getProviderDisplayName(provider: string): string {
  return getProviderProfile(provider)?.name || provider;
}

export function formatContextWindow(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return `${value}`;
}

export function getModelsForProvider(provider: string): ModelInfo[] {
  return AVAILABLE_MODELS
    .filter(model => model.provider === provider)
    .sort((a, b) => Number(b.recommended) - Number(a.recommended) || a.name.localeCompare(b.name));
}

export function hasProviderCredential(provider: string): boolean {
  const setup = PROVIDER_SETUP[provider];
  if (!setup || !setup.envVar) return true;
  return Boolean(process.env[setup.envVar]);
}

export function getRecommendedModel(provider: string): ModelInfo | undefined {
  return getModelsForProvider(provider).find(model => model.recommended) || getModelsForProvider(provider)[0];
}
