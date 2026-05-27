import { createProvider } from '@codethon/llm-client';
import type { LLMProvider, LLMMessage } from '@codethon/llm-client';
import { getLLMConfig } from '../utils/config';
import { ToolExecutor } from './tools';
import type { ToolCall, ToolResult } from './tools';
import { searchWeb, crawlUrl } from '../utils/web-search';
import { ProjectAnalyzer } from '../agents/project-analyzer';

export interface JobStatus {
  iteration: number;
  phase: 'plan' | 'thinking' | 'tool_call' | 'tool_result' | 'done';
  description: string;
  done: boolean;
  error?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  elapsed?: number;
  totalElapsed?: number;
  iterElapsed?: number;
}

export interface JobResult {
  success: boolean;
  iterations: number;
  summary: string;
  errors: string[];
  elapsed: number;
}

const EXECUTOR_PROMPT = `You are CodeThon, an autonomous execution agent.

TOOL CALL FORMAT — output multiple per iteration:
TOOL_CALL: {"id":"1","tool":"tool_name","args":{...}}
TOOL_CALL: {"id":"2","tool":"another_tool","args":{...}}

Available tools:
- read_file: Read file contents
- write_file: Write/edit files
- run_command: Execute shell commands
- list_directory: Browse project structure
- search_files: Find files by pattern
- grep_search: Search file contents
- web_search: Search the web for docs/examples
- crawl_url: Fetch webpage content

GUIDELINES:
- Understand the project first, then take action
- After running a build or test, check the output and fix errors
- Output DONE: with a summary when the goal is fully met
- Batch related operations in one iteration`;

export class JobLoop {
  private provider: LLMProvider;
  private executor: ToolExecutor;
  private maxIterations: number;
  private conversation: LLMMessage[] = [];
  private projectContext = '';
  private startTime = 0;
  private readonly COMPACT_THRESHOLD = 20;

  constructor(projectRoot: string, maxIterations = 20) {
    const config = getLLMConfig();
    this.provider = createProvider(config);
    this.executor = new ToolExecutor(projectRoot);
    this.maxIterations = maxIterations;
  }

  private async withRetry<T>(fn: () => Promise<T>, _label: string, retries = 2): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (e: any) {
        const isRetryable = e.message?.includes('504') || e.message?.includes('502') || e.message?.includes('503') || e.message?.includes('timeout') || e.message?.includes('Timeout') || e.message?.includes('ETIMEDOUT');
        if (attempt < retries && isRetryable) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        throw e;
      }
    }
    throw new Error('unreachable');
  }

  private async buildProjectContext(): Promise<string> {
    try {
      const analyzer = new ProjectAnalyzer();
      const structure = await analyzer.scanDirectory(this.executor.getProjectRoot(), 2);
      const keyFiles = await analyzer.readKeyFiles(this.executor.getProjectRoot());
      const techStack = analyzer.detectTechStack(keyFiles);

      const flat: string[] = [];
      for (const node of structure) {
        const rel = node.path.slice(this.executor.getProjectRoot().length + 1);
        if (node.isDir) flat.push(`${rel}/`);
        else flat.push(rel);
      }

      const pkg = keyFiles.get('package.json');
      let scripts = '';
      if (pkg) {
        const m = pkg.match(/"scripts"\s*:\s*\{([^}]+)\}/);
        if (m) scripts = m[1];
      }

      return [
        '## Project Context',
        `Directory: ${this.executor.getProjectRoot()}`,
        `Tech: ${techStack.join(', ') || 'Unknown'}`,
        scripts ? `Scripts: ${scripts.replace(/"([^"]+)"/g, '$1').replace(/,/g, '  |')}` : '',
        `Files: ${flat.join(', ')}`,
      ].filter(Boolean).join('\n');
    } catch {
      return `Working directory: ${this.executor.getProjectRoot()}`;
    }
  }

  private compactContext() {
    const totalChars = this.conversation.reduce((s, m) => s + m.content.length, 0);
    if (this.conversation.length <= this.COMPACT_THRESHOLD && totalChars < 8000) return;

    const sysIdx = this.conversation.findIndex(m => m.role === 'system');
    const systemMsg = sysIdx >= 0 ? this.conversation[sysIdx] : { role: 'system' as const, content: EXECUTOR_PROMPT };
    const userGoal = this.conversation.find(m => m.role === 'user' && m.content.startsWith('Goal:'));

    // Summarize tool calls and results, discard old granular messages
    const keep = this.conversation.slice(-8); // keep last 8 messages
    const old = this.conversation.slice(sysIdx >= 0 ? sysIdx + 1 : 0, this.conversation.length - 8);

    const summaryParts: string[] = [];
    for (const msg of old) {
      if (msg.role === 'assistant') {
        const tools = msg.content.match(/TOOL_CALL:.*?"tool":"(\w+)"/g);
        if (tools) summaryParts.push(...tools.map(t => t.replace(/TOOL_CALL:.*?"tool":"(\w+)".*/, '$1')));
      }
      if (msg.role === 'user' && (msg.content.startsWith('TOOL_RESULT:') || msg.content.startsWith('TOOL_ERROR:'))) {
        try {
          const d = JSON.parse(msg.content.replace(/^(TOOL_RESULT|TOOL_ERROR):\s*/, ''));
          summaryParts.push(`${d.tool}${d.error ? ' failed: ' + d.error.slice(0, 80) : ' ok'}`);
        } catch { /* skip */ }
      }
    }

    const summary = summaryParts.length > 0
      ? `[Context compacted — earlier steps: ${summaryParts.slice(0, 15).join(', ')}${summaryParts.length > 15 ? '...' : ''}]`
      : '[Context compacted — earlier steps removed]';

    this.conversation = [
      systemMsg,
      ...(userGoal ? [userGoal] : []),
      { role: 'assistant', content: summary },
      ...keep,
    ];
  }

  async execute(
    goal: string,
    onStatus?: (status: JobStatus) => void,
    onToken?: (token: string) => void,
  ): Promise<JobResult> {
    const errors: string[] = [];
    this.startTime = Date.now();

    this.projectContext = await this.buildProjectContext();

    this.conversation = [
      { role: 'system', content: EXECUTOR_PROMPT + '\n\n' + this.projectContext },
      { role: 'user', content: `Goal: ${goal}\n\nExamine what exists, then build and verify.` },
    ];

    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      const iterStart = Date.now();
      onStatus?.({
        iteration,
        phase: 'plan',
        description: `Iteration ${iteration + 1}/${this.maxIterations}`,
        done: false,
        totalElapsed: Math.floor((iterStart - this.startTime) / 1000),
      });

      let content: string;
      try {
        content = await this.withRetry(() => this.generateWithStream(onToken), 'LLM generate');
      } catch (e: any) {
        errors.push(`LLM error: ${e.message}`);
        onStatus?.({ iteration, phase: 'done', description: `LLM error: ${e.message}`, done: true, error: e.message });
        return { success: false, iterations: iteration + 1, summary: `Failed: ${e.message}`, errors, elapsed: Math.floor((Date.now() - this.startTime) / 1000) };
      }

      const genElapsed = Math.floor((Date.now() - iterStart) / 1000);

      if (/DONE:/i.test(content)) {
        const summary = content.replace(/.*DONE:\s*/is, '').trim();
        onStatus?.({
          iteration,
          phase: 'done',
          description: summary,
          done: true,
          elapsed: genElapsed,
          totalElapsed: Math.floor((Date.now() - this.startTime) / 1000),
        });
        return { success: true, iterations: iteration + 1, summary, errors, elapsed: Math.floor((Date.now() - this.startTime) / 1000) };
      }

      const toolCalls = this.parseToolCalls(content);

      if (toolCalls.length > 0) {
        for (const call of toolCalls) {
          onStatus?.({
            iteration,
            phase: 'tool_call',
            description: call.tool,
            done: false,
            toolCall: call,
          });
        }

        const results: ToolResult[] = [];
        for (const call of toolCalls) {
          const toolStart = Date.now();
          let result: ToolResult;
          if (call.tool === 'web_search') {
            result = await this.executeWebSearch(call);
          } else if (call.tool === 'crawl_url') {
            result = await this.executeCrawl(call);
          } else {
            result = await this.executor.execute(call);
          }
          result.elapsed = Math.floor((Date.now() - toolStart) / 1000);
          results.push(result);

          onStatus?.({
            iteration,
            phase: 'tool_result',
            description: result.tool,
            done: false,
            toolResult: result,
            elapsed: result.elapsed,
            totalElapsed: Math.floor((Date.now() - this.startTime) / 1000),
            iterElapsed: Math.floor((Date.now() - iterStart) / 1000),
          });
        }

        this.conversation.push({ role: 'assistant', content });
        for (const result of results) {
          const tag = result.error ? 'TOOL_ERROR' : 'TOOL_RESULT';
          const maxOutput = 2000;
          const output = result.output.length > maxOutput
            ? result.output.slice(0, maxOutput) + `\n... (truncated, ${result.output.length} total chars)`
            : result.output;
          this.conversation.push({
            role: 'user',
            content: `${tag}: ${JSON.stringify({ id: result.id, tool: result.tool, output: result.tool === 'run_command' ? output.slice(0, 800) : output, elapsed: result.elapsed, error: result.error })}`,
          });
        }

        this.conversation.push({
          role: 'user',
          content: `Continue. (elapsed: ${genElapsed}s) Analyze results above. What next? If goal met, output DONE:.`,
        });
      } else {
        this.conversation.push({ role: 'assistant', content });
        this.conversation.push({
          role: 'user',
          content: 'Output TOOL_CALL: lines for what to do next. If the goal is met, output DONE:.',
        });
      }

      // Compact context if it's grown too large
      this.compactContext();
    }

    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const summary = `Reached maximum of ${this.maxIterations} iterations without completing the goal.`;
    errors.push(summary);
    onStatus?.({
      iteration: this.maxIterations,
      phase: 'done',
      description: summary,
      done: true,
      error: summary,
      totalElapsed: elapsed,
    });

    return { success: false, iterations: this.maxIterations, summary, errors, elapsed };
  }

  private async generateWithStream(onToken?: (token: string) => void): Promise<string> {
    if (onToken && this.provider.stream) {
      let content = '';
      const stream = this.provider.stream({
        messages: this.conversation,
        temperature: 0.3,
        maxTokens: 4000,
      });
      for await (const token of stream) {
        content += token;
        onToken(token);
      }
      return content;
    }

    const response = await this.provider.generate({
      messages: this.conversation,
      temperature: 0.3,
      maxTokens: 4000,
    });
    return response.content;
  }

  private async executeWebSearch(call: ToolCall & { elapsed?: number }): Promise<ToolResult & { elapsed?: number }> {
    const query = call.args.query || '';
    if (!query) {
      return { id: call.id, tool: 'web_search', output: '', error: 'No query provided' };
    }
    try {
      const results = await searchWeb(query);
      if (results.length === 0) {
        return { id: call.id, tool: 'web_search', output: '', error: 'No search results found' };
      }
      const output = results.map((r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.snippet}`).join('\n\n');
      return { id: call.id, tool: 'web_search', output };
    } catch (e: any) {
      return { id: call.id, tool: 'web_search', output: '', error: e.message };
    }
  }

  private async executeCrawl(call: ToolCall): Promise<ToolResult & { elapsed?: number }> {
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
      } catch { /* skip malformed */ }
    }
    return calls;
  }
}
