import type { LLMProvider, LLMRequest, LLMResponse, ProviderConfig } from './index';

const OPENAI_MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'o1-preview': { input: 15.00, output: 60.00 },
  'o1-mini': { input: 3.00, output: 12.00 },
};

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  protected displayName: string;
  protected baseUrl: string;
  private apiKey: string;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private costs: { input: number; output: number };

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config.modelId || 'gpt-4o-mini';
    this.baseUrl = config.baseURL || 'https://api.openai.com/v1';
    this.defaultTemperature = config.temperature ?? 0.3;
    this.defaultMaxTokens = config.maxTokens ?? 4096;
    this.costs = OPENAI_MODEL_COSTS[this.model] || config.costPer1MTokens || { input: 3, output: 6 };
    this.displayName = config.displayName || 'OpenAI';
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        temperature: request.temperature ?? this.defaultTemperature,
        max_tokens: request.maxTokens ?? this.defaultMaxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${this.displayName} API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
      choices: { message: { content: string } }[];
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content || '',
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        temperature: request.temperature ?? this.defaultTemperature,
        max_tokens: request.maxTokens ?? this.defaultMaxTokens,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${this.displayName} API error ${response.status}: ${errText}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'data: [DONE]') continue;
        if (!trimmed.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) yield content;
        } catch { /* skip malformed */ }
      }
    }
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * this.costs.input + outputTokens * this.costs.output) / 1_000_000;
  }
}
