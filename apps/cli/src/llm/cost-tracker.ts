export interface TokenUsageRecord {
  timestamp: number;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface CostSummary {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  modelBreakdown: Map<string, { tokens: number; cost: number; calls: number }>;
  sessionDuration: number;
}

export class CostTracker {
  private usage: TokenUsageRecord[] = [];
  private sessionStart = Date.now();

  recordUsage(
    model: string,
    provider: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
  ): void {
    this.usage.push({
      timestamp: Date.now(),
      model,
      provider,
      inputTokens,
      outputTokens,
      cost,
    });
  }

  getSessionSummary(): CostSummary {
    const totalInputTokens = this.usage.reduce((s, r) => s + r.inputTokens, 0);
    const totalOutputTokens = this.usage.reduce((s, r) => s + r.outputTokens, 0);
    const totalCost = this.usage.reduce((s, r) => s + r.cost, 0);

    const modelBreakdown = new Map<string, { tokens: number; cost: number; calls: number }>();

    for (const record of this.usage) {
      const key = `${record.provider}:${record.model}`;
      const existing = modelBreakdown.get(key) || { tokens: 0, cost: 0, calls: 0 };
      modelBreakdown.set(key, {
        tokens: existing.tokens + record.inputTokens + record.outputTokens,
        cost: existing.cost + record.cost,
        calls: existing.calls + 1,
      });
    }

    return {
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      modelBreakdown,
      sessionDuration: Date.now() - this.sessionStart,
    };
  }

  displaySummary(): string {
    const summary = this.getSessionSummary();
    const lines: string[] = [];

    lines.push('LLM Usage This Session:');
    lines.push('');

    for (const [model, data] of summary.modelBreakdown) {
      const tokens = data.tokens.toLocaleString();
      const cost = data.cost === 0 ? 'FREE' : `$${data.cost.toFixed(4)}`;
      const calls = `${data.calls} call${data.calls !== 1 ? 's' : ''}`;
      lines.push(`  ${model.padEnd(35)} ${tokens.padEnd(12)} tokens  ${cost.padEnd(12)} ${calls}`);
    }

    lines.push('');
    lines.push(`  Total: $${summary.totalCost.toFixed(4)}`);

    return lines.join('\n');
  }

  reset(): void {
    this.usage = [];
    this.sessionStart = Date.now();
  }
}
