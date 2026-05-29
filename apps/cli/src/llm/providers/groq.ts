import { OpenAIProvider } from './openai';
import type { ProviderConfig } from './index';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export class GroqProvider extends OpenAIProvider {
  readonly name = 'groq';

  constructor(config: ProviderConfig) {
    super({
      ...config,
      apiKey: config.apiKey || process.env.GROQ_API_KEY || '',
      modelId: config.modelId || 'mixtral-8x7b-32768',
      baseURL: GROQ_BASE_URL,
      costPer1MTokens: config.costPer1MTokens || { input: 0, output: 0 },
      displayName: 'Groq',
    });
    this.baseUrl = GROQ_BASE_URL;
  }

  getCost(_inputTokens: number, _outputTokens: number): number {
    return 0;
  }
}
