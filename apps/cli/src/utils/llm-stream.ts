import type { LLMProvider, LLMRequest } from '@codethon/llm-client';
import { createMarkdownStreamRenderer } from './render';

export async function streamMarkdownResponse(
  provider: LLMProvider,
  request: LLMRequest,
  title: string,
): Promise<string> {
  const stream = createMarkdownStreamRenderer({ title });

  try {
    if (provider.stream) {
      let full = '';
      for await (const token of provider.stream(request)) {
        full += token;
        stream.write(token);
      }
      stream.end();
      return full;
    }

    const response = await provider.generate(request);
    stream.write(response.content);
    stream.end();
    return response.content;
  } catch (error) {
    stream.end();
    throw error;
  }
}
