import { OpenAIProvider } from './openai';
import type { ProviderConfig } from './index';

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

const DEEPSEEK_COSTS: Record<string, { input: number; output: number }> = {
  'deepseek-chat': { input: 0.14, output: 0.28 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  'deepseek-coder': { input: 0.14, output: 0.28 },
};

export class DeepSeekProvider extends OpenAIProvider {
  readonly name = 'deepseek';

  constructor(config: ProviderConfig) {
    const model = config.modelId || 'deepseek-chat';
    super({
      ...config,
      apiKey: config.apiKey || process.env.DEEPSEEK_API_KEY || '',
      modelId: model,
      baseURL: DEEPSEEK_BASE_URL,
      costPer1MTokens: config.costPer1MTokens || DEEPSEEK_COSTS[model] || { input: 0.14, output: 0.28 },
      displayName: 'DeepSeek',
    });
    this.baseUrl = DEEPSEEK_BASE_URL;
  }
}
