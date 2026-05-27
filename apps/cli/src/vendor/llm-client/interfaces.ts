import type { LLMConfig } from '@codethon/shared-types';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  generate(request: LLMRequest): Promise<LLMResponse>;
  stream?(request: LLMRequest): AsyncIterable<string>;
  name: string;
}

export function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case 'openai':
      const { OpenAIProvider } = require('./openai-adapter');
      return new OpenAIProvider(config);
    case 'nvidia':
      const { NVIDIAProvider } = require('./nvidia-adapter');
      return new NVIDIAProvider(config);
    case 'mock':
    default:
      const { MockProvider } = require('./mock-adapter');
      return new MockProvider();
  }
}
