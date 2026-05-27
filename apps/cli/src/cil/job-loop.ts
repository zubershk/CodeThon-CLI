import chalk from 'chalk';
import { createProvider } from '@codethon/llm-client';
import type { LLMProvider, LLMMessage } from '@codethon/llm-client';
import { getLLMConfig } from '../utils/config';
import { ToolExecutor } from './tools';
import type { ToolCall, ToolResult } from './tools';
import { searchWeb, crawlUrl } from '../utils/web-search';

export interface JobStatus {
  iteration: number;
  phase: 'plan' | 'research' | 'execute' | 'verify' | 'fix' | 'done';
  description: string;
  done: boolean;
  error?: string;
}

export interface JobResult {
  success: boolean;
  iterations: number;
  summary: string;
  errors: string[];
}

const EXECUTOR_PROMPT = `You are CodeThon, an autonomous hackathon execution agent. You have tools to:
- read_file: Read file contents
- write_file: Write/edit files
- search_files: Find files by pattern
- grep_search: Search file contents
- list_directory: Browse project structure
- run_command: Execute shell commands
- web_search: Search the web for documentation/examples

Your job is to take a user's goal and execute it step by step.

For each iteration:
1. PLAN: Decide what needs to be done next
2. RESEARCH: If needed, search the web for how to do it
3. EXECUTE: Use tools to make changes
4. VERIFY: Run build/test commands to check
5. FIX: If verification fails, fix the errors
6. LOOP: Continue until the goal is met

You MUST output your thinking and tool calls in this format:

THINK: What I'm trying to do and why
TOOL_CALL: {"id":"1","tool":"tool_name","args":{...}}

After each tool result, analyze it and continue. When the goal is met, output:

DONE: Summary of what was accomplished

IMPORTANT:
- Break complex goals into small, verifiable steps
- After writing code, always run the build to verify
- If you hit errors, try to fix them before giving up
- Search the web when you need documentation
- Keep files focused and concise`;

export class JobLoop {
  private provider: LLMProvider;
  private executor: ToolExecutor;
  private maxIterations: number;
  private conversation: LLMMessage[] = [];
  private webSearchTool = true;

  constructor(projectRoot: string, maxIterations = 20) {
    const config = getLLMConfig();
    this.provider = createProvider(config);
    this.executor = new ToolExecutor(projectRoot);
    this.maxIterations = maxIterations;
  }

  async execute(
    goal: string,
    onStatus?: (status: JobStatus) => void,
  ): Promise<JobResult> {
    const errors: string[] = [];

    this.conversation = [
      { role: 'system', content: EXECUTOR_PROMPT },
      { role: 'user', content: `Goal: ${goal}\n\nProject root: ${this.executor.getProjectRoot()}\n\nStart by analyzing what exists and what needs to be built. Break this into steps and execute them one at a time. Verify after each step.` },
    ];

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      onStatus?.({
        iteration,
        phase: 'plan',
        description: `Iteration ${iteration + 1}/${this.maxIterations}`,
        done: false,
      });

      // Generate next action
      const response = await this.provider.generate({
        messages: this.conversation,
        temperature: 0.3,
        maxTokens: 4000,
      });

      const content = response.content;

      // Check for DONE signal
      if (/DONE:/i.test(content)) {
        const summary = content.replace(/.*DONE:\s*/is, '').trim();
        onStatus?.({
          iteration,
          phase: 'done',
          description: summary,
          done: true,
        });
        return { success: true, iterations: iteration + 1, summary, errors };
      }

      // Parse tool calls
      const toolCalls = this.parseToolCalls(content);
      const hasWebSearch = toolCalls.some(t => t.tool === 'web_search');

      if (toolCalls.length > 0) {
        // Show which tool is being used
        for (const call of toolCalls) {
          const desc = call.tool === 'web_search' ? `Search: ${call.args.query}` :
                       call.tool === 'crawl_url' ? `Crawl: ${call.args.url}` :
                       call.tool === 'read_file' ? `Read: ${call.args.path}` :
                       call.tool === 'write_file' ? `Write: ${call.args.path}` :
                       call.tool === 'run_command' ? `Run: ${call.args.command}` :
                       call.tool === 'search_files' ? `Find: ${call.args.pattern}` :
                       call.tool === 'grep_search' ? `Grep: ${call.args.pattern}` :
                       `Tool: ${call.tool}`;

          onStatus?.({
            iteration,
            phase: 'execute',
            description: desc,
            done: false,
          });
        }

        // Execute tools
        const results: ToolResult[] = [];
        for (const call of toolCalls) {
          if (call.tool === 'web_search') {
            results.push(await this.executeWebSearch(call));
          } else if (call.tool === 'crawl_url') {
            results.push(await this.executeCrawl(call));
          } else {
            results.push(await this.executor.execute(call));
          }
        }

        // Add to conversation
        this.conversation.push({ role: 'assistant', content });
        for (const result of results) {
          const tag = result.error ? 'TOOL_ERROR' : 'TOOL_RESULT';
          const maxOutput = 2000;
          const output = result.output.length > maxOutput
            ? result.output.slice(0, maxOutput) + `\n... (truncated, ${result.output.length} total chars)`
            : result.output;
          this.conversation.push({
            role: 'user',
            content: `${tag}: ${JSON.stringify({ id: result.id, tool: result.tool, output, error: result.error })}`,
          });
        }

        // Add continuation prompt
        this.conversation.push({
          role: 'user',
          content: 'Continue. Analyze the results above. What should be done next? If the goal is met, output DONE: with a summary. If there are errors, fix them.',
        });
      } else {
        // No tool calls — LLM is thinking or instructing
        this.conversation.push({ role: 'assistant', content });
        this.conversation.push({
          role: 'user',
          content: 'What tool call should be made next? If you need to search the web, use web_search. If you need to read/write files, use the appropriate tool. If the goal is met, output DONE:.',
        });
      }
    }

    // Max iterations reached
    const summary = `Reached maximum of ${this.maxIterations} iterations without completing the goal.`;
    errors.push(summary);
    onStatus?.({
      iteration: this.maxIterations,
      phase: 'done',
      description: summary,
      done: true,
      error: summary,
    });

    return { success: false, iterations: this.maxIterations, summary, errors };
  }

  private async executeWebSearch(call: ToolCall): Promise<ToolResult> {
    const query = call.args.query || '';
    if (!query) {
      return { id: call.id, tool: 'web_search', output: '', error: 'No query provided' };
    }

    try {
      const results = await searchWeb(query);
      if (results.length === 0) {
        return { id: call.id, tool: 'web_search', output: '', error: 'No search results found' };
      }

      const output = results.map((r, i) =>
        `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.snippet}`
      ).join('\n\n');

      return { id: call.id, tool: 'web_search', output };
    } catch (e: any) {
      return { id: call.id, tool: 'web_search', output: '', error: e.message };
    }
  }

  private async executeCrawl(call: ToolCall): Promise<ToolResult> {
    const url = call.args.url || '';
    if (!url) {
      return { id: call.id, tool: 'crawl_url', output: '', error: 'No URL provided' };
    }
    try {
      const page = await crawlUrl(url);
      if (!page.title && !page.text) {
        return { id: call.id, tool: 'crawl_url', output: '', error: page.description || 'Failed to fetch page content' };
      }
      const output = [
        `URL: ${page.url}`,
        page.title ? `Title: ${page.title}` : '',
        page.description ? `Description: ${page.description}` : '',
        '',
        page.text,
        '',
        page.links.length > 0 ? `Links (${page.links.length}):\n${page.links.slice(0, 15).map(l => `  - ${l.text} (${l.href})`).join('\n')}` : '',
      ].filter(Boolean).join('\n');
      return { id: call.id, tool: 'crawl_url', output };
    } catch (e: any) {
      return { id: call.id, tool: 'crawl_url', output: '', error: e.message };
    }
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
        // skip malformed
      }
    }
    return calls;
  }
}
