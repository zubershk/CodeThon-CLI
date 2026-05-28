import { OpenAIProvider } from './openai';
import type { ProviderConfig } from './index';

export class LocalServerProvider extends OpenAIProvider {
  readonly name = 'local-server';

  constructor(config: ProviderConfig) {
    super({
      ...config,
      apiKey: config.apiKey || 'not-needed',
      baseURL: config.baseURL || process.env.LOCAL_LLM_URL || 'http://localhost:1234/v1',
      costPer1MTokens: { input: 0, output: 0 },
    });
  }

  getCost(_inputTokens: number, _outputTokens: number): number {
    return 0;
  }
}
