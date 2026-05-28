import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GroqProvider } from './groq';
import { DeepSeekProvider } from './deepseek';
import { TogetherProvider } from './together';
import { OllamaProvider } from './ollama';
import { LocalServerProvider } from './local-server';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequest {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMProvider {
  name: string;
  generate(request: LLMRequest): Promise<LLMResponse>;
  stream?(request: LLMRequest): AsyncIterable<string>;
  countTokens(text: string): number;
  getCost(inputTokens: number, outputTokens: number): number;
}

export type ProviderType =
  | 'openai'
  | 'anthropic'
  | 'groq'
  | 'deepseek'
  | 'together'
  | 'ollama'
  | 'local-server'
  | 'nvidia';

export interface ProviderConfig {
  provider: ProviderType;
  modelId: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
  costPer1MTokens?: { input: number; output: number };
}

export function createProvider(config: ProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'openai': return new OpenAIProvider(config);
    case 'anthropic': return new AnthropicProvider(config);
    case 'groq': return new GroqProvider(config);
    case 'deepseek': return new DeepSeekProvider(config);
    case 'together': return new TogetherProvider(config);
    case 'ollama': return new OllamaProvider(config);
    case 'local-server': return new LocalServerProvider(config);
    case 'nvidia': return createProvider({
      ...config,
      provider: 'openai',
      baseURL: 'https://integrate.api.nvidia.com/v1',
      modelId: config.modelId || 'nvidia/llama-3.3-nemotron-super-49b-v1',
    });
    default: throw new Error(`Unknown provider: ${config.provider}`);
  }
}
