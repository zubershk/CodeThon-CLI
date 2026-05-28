import { createProvider as createProviderInner } from '../../llm/providers/index';
import type { LLMConfig } from '../shared-types/index';

export type { LLMMessage, LLMRequest, LLMResponse, LLMProvider, ProviderConfig, ProviderType, ToolDefinition } from '../../llm/providers/index';

export function createProvider(config: LLMConfig): import('../../llm/providers/index').LLMProvider {
  return createProviderInner({
    provider: config.provider as import('../../llm/providers/index').ProviderType,
    modelId: config.model || 'gpt-4o-mini',
    apiKey: config.apiKey,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
  });
}
