import { OpenAIProvider } from './openai';
import type { ProviderConfig } from './index';

const TOGETHER_BASE_URL = 'https://api.together.xyz/v1';

export class TogetherProvider extends OpenAIProvider {
  readonly name = 'together';

  constructor(config: ProviderConfig) {
    super({
      ...config,
      apiKey: config.apiKey || process.env.TOGETHER_API_KEY || '',
      modelId: config.modelId || 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      baseURL: TOGETHER_BASE_URL,
      costPer1MTokens: config.costPer1MTokens || { input: 0.10, output: 0.10 },
    });
    this.baseUrl = TOGETHER_BASE_URL;
  }
}
