import type { LLMProvider, LLMRequest, LLMResponse, LLMMessage, ProviderConfig } from './index';

const BASE_URL = 'https://api.anthropic.com/v1';

const CLAUDE_MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
};

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private apiKey: string;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private costs: { input: number; output: number };

  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.model = config.modelId || 'claude-3-5-sonnet-20241022';
    this.defaultTemperature = config.temperature ?? 0.3;
    this.defaultMaxTokens = config.maxTokens ?? 4096;
    this.costs = CLAUDE_MODEL_COSTS[this.model] || config.costPer1MTokens || { input: 3, output: 15 };
  }

  private toAnthropicMessages(messages: LLMMessage[]) {
    const systemMsgs = messages.filter(m => m.role === 'system');
    const nonSystem = messages.filter(m => m.role !== 'system');
    return {
      system: systemMsgs.map(m => m.content).join('\n'),
      messages: nonSystem.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user' as const,
        content: m.content,
      })),
    };
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const { system, messages } = this.toAnthropicMessages(request.messages);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
      temperature: request.temperature ?? this.defaultTemperature,
      messages,
    };
    if (system) body.system = system;

    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
      content: { text: string }[];
      usage?: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content.map(c => c.text).join(''),
      usage: data.usage ? {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<string> {
    const { system, messages } = this.toAnthropicMessages(request.messages);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: request.maxTokens ?? this.defaultMaxTokens,
      temperature: request.temperature ?? this.defaultTemperature,
      messages,
      stream: true,
    };
    if (system) body.system = system;

    const response = await fetch(`${BASE_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errText}`);
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
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        try {
          const json = JSON.parse(trimmed.slice(6));
          if (json.type === 'content_block_delta' && json.delta?.text) {
            yield json.delta.text;
          }
        } catch { /* skip malformed */ }
      }
    }
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 3.5);
  }

  getCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * this.costs.input + outputTokens * this.costs.output) / 1_000_000;
  }
}
