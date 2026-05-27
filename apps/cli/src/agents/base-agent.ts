import { createProvider } from '@codethon/llm-client';
import type { LLMProvider, LLMMessage } from '@codethon/llm-client';
import type { AgentOutput, LLMConfig } from '@codethon/shared-types';
import { getLLMConfig } from '../utils/config';
import { SYSTEM_PROMPT } from '../prompts';
import { ContextBuilder } from '../cil/context-builder';
import { TOOL_DEFINITIONS, ToolExecutor, formatToolCallForPrompt } from '../cil/tools';
import type { ToolCall, ToolResult } from '../cil/tools';

export class BaseAgent {
  protected provider: LLMProvider;
  protected systemPrompt: string;
  protected contextBuilder: ContextBuilder;
  protected toolExecutor: ToolExecutor | null = null;
  protected enableTools: boolean;

  constructor(agentPrompt: string, useTools = false) {
    const config: LLMConfig = getLLMConfig();
    this.provider = createProvider(config);
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

  setProjectRoot(root: string): void {
    this.toolExecutor = new ToolExecutor(root);
  }

  getToolExecutor(): ToolExecutor | null {
    return this.toolExecutor;
  }

  async run(command: string, userInput?: string): Promise<AgentOutput> {
    const context = this.contextBuilder.buildContext(command, userInput);
    const messages: LLMMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: context },
    ];

    if (this.enableTools && this.toolExecutor) {
      const finalContent = await this.runWithTools(messages);
      return {
        summary: this.extractSummary(finalContent),
        details: finalContent,
        data: { raw: finalContent },
      };
    }

    const response = await this.provider.generate({ messages });
    return {
      summary: this.extractSummary(response.content),
      details: response.content,
      data: { raw: response.content },
    };
  }

  async runStream(command: string, onToken: (token: string) => void, userInput?: string): Promise<string> {
    const context = this.contextBuilder.buildContext(command, userInput);
    const messages: LLMMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: context },
    ];

    if (this.enableTools && this.toolExecutor) {
      const full = await this.runWithTools(messages, onToken);
      return full;
    }

    if (this.provider.stream) {
      let full = '';
      for await (const token of this.provider.stream({ messages })) {
        full += token;
        onToken(token);
      }
      return full;
    }

    const response = await this.provider.generate({ messages });
    onToken(response.content);
    return response.content;
  }

  private async runWithTools(messages: LLMMessage[], onToken?: (token: string) => void): Promise<string> {
    const MAX_TOOL_LOOPS = 8;
    let fullResponse = '';

    for (let loop = 0; loop < MAX_TOOL_LOOPS; loop++) {
      let response: string;
      if (this.provider.stream && loop === 0) {
        let acc = '';
        for await (const token of this.provider.stream({ messages })) {
          acc += token;
          onToken?.(token);
        }
        response = acc;
      } else {
        const result = await this.provider.generate({ messages });
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

      // Execute tools
      const results = await Promise.all(
        toolCalls.map(call => this.toolExecutor!.execute(call))
      );

      // Add to conversation
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
