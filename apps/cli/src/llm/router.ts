import { createProvider } from './providers/index';
import type { LLMProvider, ProviderConfig } from './providers/index';
import { detectAvailableModels, rankModelsByUseCase } from './auto-detect';
import type { DetectedModel } from './auto-detect';

export type UseCase = 'quick' | 'code-generation' | 'analysis' | 'research';

export interface StrategyConfig {
  preferredModels: string[];
  timeout: number;
  maxTokens: number;
}

const USE_CASE_STRATEGIES: Record<UseCase, StrategyConfig> = {
  quick: {
    preferredModels: ['ollama:neural-chat', 'mixtral-8x7b-32768', 'claude-3-5-haiku-20241022'],
    timeout: 10000,
    maxTokens: 500,
  },
  'code-generation': {
    preferredModels: ['gpt-4o', 'claude-3-5-sonnet-20241022', 'deepseek-chat'],
    timeout: 30000,
    maxTokens: 4000,
  },
  analysis: {
    preferredModels: ['claude-3-5-sonnet-20241022', 'gpt-4o', 'mixtral-8x7b-32768'],
    timeout: 20000,
    maxTokens: 2000,
  },
  research: {
    preferredModels: ['claude-3-5-sonnet-20241022', 'gpt-4o'],
    timeout: 60000,
    maxTokens: 3000,
  },
};

export class LLMRouter {
  private providers: Map<string, LLMProvider> = new Map();
  private modelConfigs: Map<string, DetectedModel> = new Map();
  private initialized = false;

  async init(): Promise<DetectedModel[]> {
    const models = await detectAvailableModels();
    for (const model of models) {
      this.modelConfigs.set(model.modelId, model);
    }
    this.initialized = true;
    return models;
  }

  getAvailableModels(): DetectedModel[] {
    return Array.from(this.modelConfigs.values());
  }

  async selectBestModel(useCase: UseCase): Promise<{ provider: LLMProvider; config: DetectedModel }> {
    if (!this.initialized) await this.init();

    const ranked = rankModelsByUseCase(this.getAvailableModels(), useCase);
    if (ranked.length === 0) {
      throw new Error(`No models available for use case "${useCase}". Set an API key or start a local LLM.`);
    }
    const config = ranked[0];
    const provider = this.getProvider(config);
    return { provider, config };
  }

  async callWithFallback(
    prompt: string,
    useCase: UseCase,
    systemPrompt?: string,
  ): Promise<{ response: string; model: string; providerName: string }> {
    if (!this.initialized) await this.init();

    const strategy = USE_CASE_STRATEGIES[useCase];
    const models = this.getAvailableModels();
    const ranked = rankModelsByUseCase(models, useCase);

    const triedModels = new Set<string>();

    for (const model of ranked) {
      if (triedModels.has(model.modelId)) continue;
      triedModels.add(model.modelId);

      try {
        const provider = this.getProvider(model);
        const messages = [
          ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
          { role: 'user' as const, content: prompt },
        ];

        const response = await Promise.race([
          provider.generate({ messages, maxTokens: strategy.maxTokens }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), strategy.timeout)
          ),
        ]);

        return { response: response.content, model: model.modelId, providerName: model.provider };
      } catch (err) {
        continue;
      }
    }

    throw new Error(`All models exhausted for use case "${useCase}"`);
  }

  private getProvider(config: DetectedModel): LLMProvider {
    const existing = this.providers.get(config.modelId);
    if (existing) return existing;

    const provider = createProvider(config);
    this.providers.set(config.modelId, provider);
    return provider;
  }
}
