import OpenAI from 'openai';
import type { LLMProvider, LLMRequest, LLMResponse } from './interfaces';
import type { LLMConfig } from '@codethon/shared-types';

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: LLMConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
    this.model = config.model || 'gpt-4o-mini';
    this.defaultTemperature = config.temperature ?? 0.3;
    this.defaultMaxTokens = config.maxTokens ?? 2048;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: request.messages,
      temperature: request.temperature ?? this.defaultTemperature,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
    });

    const choice = completion.choices[0];
    return {
      content: choice?.message?.content || '',
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
    };
  }
}
