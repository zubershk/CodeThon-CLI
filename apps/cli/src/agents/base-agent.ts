import { createProvider } from '@codethon/llm-client';
import type { LLMProvider, LLMMessage } from '@codethon/llm-client';
import type { AgentOutput } from '@codethon/shared-types';
import { getLLMConfig, validateProviderConfig } from '../utils/config';
import { formatApiError, friendlyAgentError, isAuthError } from '../utils/api-error';
import { SYSTEM_PROMPT } from '../prompts';
import { ContextBuilder } from '../cil/context-builder';
import { TOOL_DEFINITIONS, ToolExecutor, formatToolCallForPrompt } from '../cil/tools';
import type { ToolCall, ToolResult } from '../cil/tools';

export class BaseAgentError extends Error {
  constructor(msg: string, public readonly cause?: unknown) {
    super(msg);
    this.name = 'BaseAgentError';
  }
}

function wrapProviderError(e: unknown): never {
  if (isAuthError(e)) {
    throw new BaseAgentError(friendlyAgentError(e), e);
  }
  throw new BaseAgentError(
    `AI service error: ${e instanceof Error ? e.message : String(e)}\n\n  Run /doctor inside ct, or ct doctor from your shell to check system diagnostics.`,
    e,
  );
}

export class BaseAgent {
  protected provider: LLMProvider | null = null;
  protected systemPrompt: string;
  protected contextBuilder: ContextBuilder;
  protected toolExecutor: ToolExecutor | null = null;
  protected enableTools: boolean;

  constructor(agentPrompt: string, useTools = false) {
    const config = getLLMConfig();
    try {
      this.provider = createProvider(config);
    } catch (e) {
      // provider creation will fail at runtime when used
    }
    this.enableTools = useTools;
    let fullPrompt = `${SYSTEM_PROMPT}\n\n${agentPrompt}`;

    if (useTools) {
      fullPrompt += `\n\nYou have access to tools. To call a tool, output exactly one line in this format:
TOOL_CALL: {"id":"<unique-id>","tool":"<tool-name>","args":{...}}

The tools available are:
${formatToolCallForPrompt()}

After your tool call, you will receive the result and can continue. You can make multiple tool calls. When done, provide your final answer.`;
    }

    this.systemPrompt = fullPrompt;
    this.contextBuilder = new ContextBuilder();
  }

  setProjectRoot(root: string, ask = false): void {
    this.toolExecutor = new ToolExecutor(root, ask);
  }

  getToolExecutor(): ToolExecutor | null {
    return this.toolExecutor;
  }

  private ensureProvider(): LLMProvider {
    const check = validateProviderConfig();
    if (!check.ok) throw new BaseAgentError(`\u26A0  ${check.message}`, undefined as any);
    if (this.provider) return this.provider;
    const config = getLLMConfig();
    this.provider = createProvider(config);
    return this.provider;
  }

  async run(command: string, userInput?: string): Promise<AgentOutput> {
    const context = this.contextBuilder.buildContext(command, userInput);
    const messages: LLMMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: context },
    ];

    let provider: LLMProvider;
    try {
      provider = this.ensureProvider();
    } catch (e) {
      wrapProviderError(e);
    }

    if (this.enableTools && this.toolExecutor) {
      try {
        const finalContent = await this.runWithTools(provider, messages);
        return {
          summary: this.extractSummary(finalContent),
          details: finalContent,
          data: { raw: finalContent },
        };
      } catch (e) { wrapProviderError(e); }
    }

    try {
      const response = await provider.generate({ messages });
      return {
        summary: this.extractSummary(response.content),
        details: response.content,
        data: { raw: response.content },
      };
    } catch (e) { wrapProviderError(e); }
  }

  async runStream(command: string, onToken: (token: string) => void, userInput?: string): Promise<string> {
    const context = this.contextBuilder.buildContext(command, userInput);
    const messages: LLMMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: context },
    ];

    let provider: LLMProvider;
    try {
      provider = this.ensureProvider();
    } catch (e) {
      wrapProviderError(e);
    }

    if (this.enableTools && this.toolExecutor) {
      try {
        const full = await this.runWithTools(provider, messages, onToken);
        return full;
      } catch (e) { wrapProviderError(e); }
    }

    try {
      if (provider.stream) {
        let full = '';
        for await (const token of provider.stream({ messages })) {
          full += token;
          onToken(token);
        }
        return full;
      }

      const response = await provider.generate({ messages });
      onToken(response.content);
      return response.content;
    } catch (e) { wrapProviderError(e); }
  }

  private async runWithTools(provider: LLMProvider, messages: LLMMessage[], onToken?: (token: string) => void): Promise<string> {
    const MAX_TOOL_LOOPS = 8;
    let fullResponse = '';

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
      let response: string;
      if (provider.stream && loop === 0) {
        let acc = '';
        for await (const token of provider.stream({ messages })) {
          acc += token;
          onToken?.(token);
        }
        response = acc;
      } else {
        const result = await provider.generate({ messages });
        response = result.content;
        if (onToken && loop === 0) {
          onToken(response);
        }
      }

      const toolCalls = this.parseToolCalls(response);
      if (toolCalls.length === 0) {
        fullResponse = response;
        break;
      }

      const results = await Promise.all(
        toolCalls.map(call => this.toolExecutor!.execute(call))
      );

      messages.push({ role: 'assistant', content: response });
      for (const result of results) {
        const tag = result.error ? 'TOOL_ERROR' : 'TOOL_RESULT';
        messages.push({
          role: 'user',
          content: `${tag}: ${JSON.stringify(result)}`,
        });
        if (onToken) {
          onToken(`\n  ${result.error ? '\u2717' : '\u2713'} [${result.tool}] ${result.output.slice(0, 100)}${result.output.length > 100 ? '...' : ''}\n`);
        }
      }

      fullResponse = response;
    }

    return fullResponse;
  }

  private parseToolCalls(content: string): ToolCall[] {
    const calls: ToolCall[] = [];
    const regex = /TOOL_CALL:\s*(\{[\s\S]*?\})(?=\n|$)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.tool && parsed.id) {
          calls.push({ id: parsed.id, tool: parsed.tool, args: parsed.args || {} });
        }
      } catch {
        // skip malformed calls
      }
    }
    return calls;
  }

  protected extractSummary(content: string): string {
    const lines = content.split('\n').filter((l) => l.trim());
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('## ')) return trimmed.replace('## ', '');
      if (trimmed.startsWith('# ')) return trimmed.replace('# ', '');
      if (trimmed.length > 10 && !trimmed.startsWith('-') && !trimmed.startsWith('```') && !trimmed.startsWith('TOOL_')) {
        return trimmed.slice(0, 100);
      }
    }
    return content.slice(0, 100);
  }
}
