export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
    'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'mixtral-8x7b-32768': { input: 0, output: 0 },
    'llama-3.3-70b-versatile': { input: 0, output: 0 },
    'deepseek-chat': { input: 0.14, output: 0.28 },
    'deepseek-reasoner': { input: 0.55, output: 2.19 },
  };

  const rate = rates[model];
  if (!rate) return 0;

  return (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
}

export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return `${tokens} tokens`;
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(1)}K tokens`;
  return `${(tokens / 1_000_000).toFixed(2)}M tokens`;
}
