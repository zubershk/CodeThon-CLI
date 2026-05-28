import type { LLMProvider, LLMRequest, LLMResponse, ProviderConfig } from './index';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private baseURL: string;
  private model: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: ProviderConfig) {
    this.baseURL = config.baseURL || process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = config.modelId || 'neural-chat';
    this.defaultTemperature = config.temperature ?? 0.3;
    this.defaultMaxTokens = config.maxTokens ?? 4096;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
        options: {
          temperature: request.temperature ?? this.defaultTemperature,
          num_predict: request.maxTokens ?? this.defaultMaxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errText}`);
    }

    const data = await response.json() as {
      message: { content: string };
    };

    return { content: data.message?.content || '' };
  }

  async *stream(request: LLMRequest): AsyncIterable<string> {
    const response = await fetch(`${this.baseURL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
        options: {
          temperature: request.temperature ?? this.defaultTemperature,
          num_predict: request.maxTokens ?? this.defaultMaxTokens,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${errText}`);
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
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line);
          if (data.message?.content) yield data.message.content;
          if (data.done) break;
        } catch { /* skip */ }
      }
    }
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getCost(_inputTokens: number, _outputTokens: number): number {
    return 0;
  }
}
