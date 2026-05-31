import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { sanitizeEnv } from '../utils/env';
import { requireApproval } from '../utils/approval';

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface ToolCall {
  id: string;
  tool: string;
  args: Record<string, any>;
}

export interface ToolResult {
  id: string;
  tool: string;
  output: string;
  error?: string;
  elapsed?: number;
}

const SKIP_DIRS = new Set([
  'node_modules', '.pnpm', '.yarn', '.npm',
  '.git', '.svn', '.hg',
  'dist', 'build', 'out', '.next', '.nuxt', '.output',
  'target', 'bin', 'obj',
  '.venv', 'venv', 'env', '__pycache__', '.cache',
  '.pytest_cache', '.mypy_cache',
  'coverage', '.nyc_output',
  '.turbo', '.nx',
  '.vscode', '.idea',
]);
const MAX_FILE_SIZE = 500_000; // 500KB

export const TOOL_DEFINITIONS: ToolDef[] = [
  {
    name: 'read_file',
    description: 'Read a file from the project. Returns content with line numbers.',
    parameters: {
      path: { type: 'string', description: 'Relative path from project root' },
      maxLines: { type: 'number', description: 'Max lines to read (default: 200)' },
    },
  },
  {
    name: 'write_file',
    description: 'Write content to a file. Creates directories if needed. OVERWRITES existing files.',
    parameters: {
      path: { type: 'string', description: 'Relative path from project root' },
      content: { type: 'string', description: 'Full file content to write' },
    },
  },
  {
    name: 'search_files',
    description: 'Search for files by glob pattern (e.g. "src/**/*.ts", "**/config.*").',
    parameters: {
      pattern: { type: 'string', description: 'Glob pattern to match' },
      maxResults: { type: 'number', description: 'Max results (default: 30)' },
    },
  },
  {
    name: 'grep_search',
    description: 'Search file contents for a regex pattern. Returns matching lines with file:line.',
    parameters: {
      pattern: { type: 'string', description: 'Regex pattern to search for' },
      include: { type: 'string', description: 'File glob filter (e.g. "*.ts", "*.json")' },
      maxResults: { type: 'number', description: 'Max matches (default: 30)' },
    },
  },
  {
    name: 'list_directory',
    description: 'List files and directories in a path. Shows structure up to 2 levels deep.',
    parameters: {
      path: { type: 'string', description: 'Relative path from project root' },
      depth: { type: 'number', description: 'How deep to traverse (1-3, default: 2)' },
    },
  },
  {
    name: 'web_search',
    description: 'Search the web for documentation, examples, or solutions. No API key needed — uses DuckDuckGo/Bing.',
    parameters: {
      query: { type: 'string', description: 'Search query' },
    },
  },
  {
    name: 'crawl_url',
    description: 'Fetch and extract the full content of a webpage. Returns title, headings, paragraphs, links. Use this to read documentation or analyze websites.',
    parameters: {
      url: { type: 'string', description: 'Full URL to crawl (e.g. https://example.com/page)' },
    },
  },
  {
    name: 'run_command',
    description: 'Execute a shell command in the project root. Allowed: npm, npx, node, git, pnpm, yarn, next, vite, tsc, eslint',
    parameters: {
      command: { type: 'string', description: 'Shell command to execute' },
      timeout: { type: 'number', description: 'Timeout in ms (default: 30000)' },
    },
  },
];

import { isAllowedBinary, BLOCKED_PATTERNS } from '../security/policy';

export class ToolExecutor {
  private projectRoot: string;
  private fileHistory: Map<string, string> = new Map();
  private askMode: boolean;
  private dryRun: boolean;

  constructor(projectRoot: string, askMode = false, dryRun = false) {
    this.projectRoot = path.resolve(projectRoot);
    this.askMode = askMode;
    this.dryRun = dryRun;
  }

  async execute(call: ToolCall): Promise<ToolResult> {
    try {
      switch (call.tool) {
        case 'read_file': return await this.readFile(call);
        case 'write_file': return await this.writeFile(call);
        case 'search_files': return await this.searchFiles(call);
        case 'grep_search': return await this.grepSearch(call);
        case 'list_directory': return await this.listDir(call);
        case 'run_command': return await this.runCommand(call);
        default:
          return { id: call.id, tool: call.tool, output: '', error: `Unknown tool: ${call.tool}` };
      }
    } catch (e: any) {
      return { id: call.id, tool: call.tool, output: '', error: e.message };
    }
  }

  getProjectRoot(): string { return this.projectRoot; }

  private stringArg(call: ToolCall, keys: string[], arrayKeys: string[] = []): string | null {
    const args = call.args || {};
    for (const key of keys) {
      const value = args[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    for (const key of arrayKeys) {
      const value = args[key];
      if (!Array.isArray(value)) continue;
      const found = value.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
      if (found) return found.trim();
    }

    return null;
  }

  private numberArg(call: ToolCall, key: string, fallback: number): number {
    const value = call.args?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
    return fallback;
  }

  private missingArg(call: ToolCall, arg: string, example: string): ToolResult {
    return {
      id: call.id,
      tool: call.tool,
      output: '',
      error: `${call.tool} needs a ${arg}. Example: ${example}`,
    };
  }

  private resolvePath(relativePath: string): string {
    const resolved = path.resolve(this.projectRoot, relativePath);
    const relative = path.relative(this.projectRoot, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Path "${relativePath}" escapes project root`);
    }
    return resolved;
  }

  private async readFile(call: ToolCall): Promise<ToolResult> {
    const requestedPath = this.stringArg(call, ['path', 'file', 'filePath', 'filename', 'target'], ['paths', 'files']);
    if (!requestedPath) {
      return this.missingArg(call, 'file path', '{"path":"src/index.ts"}');
    }

    const filePath = this.resolvePath(requestedPath);
    if (!fs.existsSync(filePath)) {
      return { id: call.id, tool: call.tool, output: '', error: `File not found: ${requestedPath}` };
    }
    const stat = fs.statSync(filePath);
    if (stat.size > MAX_FILE_SIZE) {
      return { id: call.id, tool: call.tool, output: '', error: `File too large (${(stat.size / 1024).toFixed(0)}KB > 500KB limit)` };
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const maxLines = this.numberArg(call, 'maxLines', 200);
    const truncated = lines.length > maxLines;
    const display = lines.slice(0, maxLines).map((l, i) => `${(i + 1).toString().padStart(4, ' ')}| ${l}`).join('\n');
    const note = truncated ? `\n... (${lines.length - maxLines} more lines, file has ${lines.length} total)` : '';
    return { id: call.id, tool: call.tool, output: `${requestedPath} (${lines.length} lines)\n${display}${note}` };
  }

  private async writeFile(call: ToolCall): Promise<ToolResult> {
    const requestedPath = this.stringArg(call, ['path', 'file', 'filePath', 'filename', 'target'], ['paths', 'files']);
    if (!requestedPath) {
      return this.missingArg(call, 'target file path', '{"path":"src/index.ts","content":"..."}');
    }
    if (typeof call.args?.content !== 'string') {
      return this.missingArg(call, 'file content string', '{"path":"src/index.ts","content":"..."}');
    }

    const filePath = this.resolvePath(requestedPath);
    const dir = path.dirname(filePath);

    if (this.dryRun) {
      const existing = fs.existsSync(filePath) ? ' (overwrite)' : '';
      return { id: call.id, tool: call.tool, output: `[DRY RUN] Would write ${requestedPath} (${call.args.content.length} bytes)${existing}` };
    }

    if (this.askMode) {
      const existing = fs.existsSync(filePath);
      const approved = await requireApproval({
        type: existing ? 'modify_file' : 'write_file',
        description: existing ? `Modify: ${requestedPath}` : `Create: ${requestedPath}`,
        details: `Path: ${filePath}\nSize: ~${(call.args.content?.length ?? 0)} bytes`,
        risk: existing ? (call.args.content?.length > 10000 ? 'high' : 'medium') : 'low',
      });
      if (!approved) {
        return { id: call.id, tool: call.tool, output: '', error: 'Write rejected by user (--ask mode)' };
      }
    }

    const isEnvFile = path.basename(filePath) === '.env';
    if (isEnvFile) {
      const hasPlaceholder = /your[_-]?(api|key|secret|token)[_-]?here/i.test(call.args.content || '') || call.args.content?.includes('your_nvidia_api_key_here');
      if (hasPlaceholder) {
        return { id: call.id, tool: call.tool, output: `Skipped .env (contains placeholder values — keys are already in environment)`, error: 'REJECTED: .env with placeholder keys. The environment is already configured.' };
      }
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    // Back up existing file for undo
    if (fs.existsSync(filePath)) {
      this.fileHistory.set(filePath, fs.readFileSync(filePath, 'utf-8'));
    }
    fs.writeFileSync(filePath, call.args.content, 'utf-8');
    return { id: call.id, tool: call.tool, output: `Wrote ${requestedPath} (${call.args.content.length} bytes)` };
  }

  private async searchFiles(call: ToolCall): Promise<ToolResult> {
    const pattern = this.stringArg(call, ['pattern', 'glob', 'query']);
    if (!pattern) {
      return this.missingArg(call, 'file search pattern', '{"pattern":"src/**/*.ts"}');
    }
    const maxResults = this.numberArg(call, 'maxResults', 30);
    const files: string[] = [];
    const maxDepth = 5;

    const walk = (dir: string, depth: number): void => {
      if (depth > maxDepth || files.length >= maxResults) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
          if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
          const full = path.join(dir, e.name);
          const rel = path.relative(this.projectRoot, full).replace(/\\/g, '/');
          if (e.isDirectory()) {
            walk(full, depth + 1);
          } else {
            // Simple glob matching: support *, **, ?
            if (this.globMatch(rel, pattern)) {
              files.push(rel);
              if (files.length >= maxResults) return;
            }
          }
        }
      } catch { /* skip */ }
    };

    walk(this.projectRoot, 0);
    const note = files.length >= maxResults ? `\n... (truncated at ${maxResults})` : '';
    return { id: call.id, tool: call.tool, output: `Found ${files.length} files:\n${files.join('\n')}${note}` };
  }

  private globMatch(filePath: string, pattern: string): boolean {
    // Simple glob: convert **/*.ts patterns to regex
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '___DOUBLESTAR___')
      .replace(/\*/g, '[^/]*')
      .replace(/___DOUBLESTAR___/g, '.*')
      .replace(/\?/g, '.');
    try {
      return new RegExp(`^${escaped}$`).test(filePath);
    } catch {
      return filePath.includes(pattern.replace(/\*/g, ''));
    }
  }

  private async grepSearch(call: ToolCall): Promise<ToolResult> {
    const pattern = this.stringArg(call, ['pattern', 'query', 'text']);
    if (!pattern) {
      return this.missingArg(call, 'search pattern', '{"pattern":"TODO","include":"*.ts"}');
    }
    const maxResults = this.numberArg(call, 'maxResults', 30);
    const include = this.stringArg(call, ['include', 'glob', 'files']) || '*';

    // Try ripgrep first
    let results = '';
    try {
      const rgResult = spawnSync('rg', [
        '-n', pattern,
        '--glob', include,
        '--glob', '!node_modules',
        '--glob', '!.git',
        '--glob', '!.next',
        '--glob', '!dist',
        '-m', '5',
      ], {
        cwd: this.projectRoot,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
        timeout: 10000,
        shell: false,
      });
      results = rgResult.stdout ?? '';
      if (rgResult.error) throw rgResult.error;
    } catch {
      // Fallback: manual grep using Node.js
      const matches: string[] = [];
      const walkDir = (dir: string): void => {
        if (matches.length >= maxResults) return;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const e of entries) {
            if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
            const full = path.join(dir, e.name);
            const rel = path.relative(this.projectRoot, full).replace(/\\/g, '/');
            if (e.isDirectory()) {
              walkDir(full);
            } else if (this.globMatch(rel, include)) {
              try {
                const content = fs.readFileSync(full, 'utf-8');
                const lines = content.split('\n');
                for (let i = 0; i < lines.length; i++) {
                  try {
                    if (new RegExp(pattern, 'i').test(lines[i])) {
                      matches.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 120)}`);
                      if (matches.length >= maxResults) break;
                    }
                  } catch { /* bad regex */ }
                }
              } catch { /* can't read */ }
            }
          }
        } catch { /* skip */ }
      };
      walkDir(this.projectRoot);
      results = matches.join('\n');
    }

    const lines = results.split('\n').filter(Boolean);
    const limited = lines.slice(0, maxResults);
    const note = lines.length > maxResults ? `\n... and ${lines.length - maxResults} more matches` : '';
    return { id: call.id, tool: call.tool, output: `${lines.length} matches:\n${limited.join('\n')}${note}` };
  }

  private async listDir(call: ToolCall): Promise<ToolResult> {
    const requestedPath = this.stringArg(call, ['path', 'dir', 'directory', 'target'], ['paths']) || '.';
    const dirPath = this.resolvePath(requestedPath);
    if (!fs.existsSync(dirPath)) {
      return { id: call.id, tool: call.tool, output: '', error: `Directory not found: ${requestedPath}` };
    }
    const depth = Math.min(this.numberArg(call, 'depth', 2), 3);
    const lines: string[] = [];
    function walk(dir: string, prefix = ''): void {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch { return; }
      entries = entries.filter(e => !e.name.startsWith('.') && !SKIP_DIRS.has(e.name));
      for (let i = 0; i < entries.length; i++) {
        const e = entries[i];
        const isLast = i === entries.length - 1;
        const conn = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
        lines.push(`${prefix}${conn}${e.name}${e.isDirectory() ? '/' : ''}`);
        if (e.isDirectory() && prefix.length / 4 < depth) {
          walk(path.join(dir, e.name), prefix + (isLast ? '    ' : '\u2502   '));
        }
      }
    }
    walk(dirPath);
    return { id: call.id, tool: call.tool, output: lines.join('\n') };
  }

  private async runCommand(call: ToolCall): Promise<ToolResult> {
    const cmd = this.stringArg(call, ['command', 'cmd']);
    if (!cmd) {
      return this.missingArg(call, 'command string', '{"command":"npm run build"}');
    }
    const parts = cmd.split(/\s+/);
    const first = parts[0];
    if (!isAllowedBinary(first)) {
      return { id: call.id, tool: call.tool, output: '', error: `Command "${first}" is not allowed` };
    }
    for (const re of BLOCKED_PATTERNS) {
      if (re.test(cmd)) {
        return { id: call.id, tool: call.tool, output: '', error: 'Command matches blocked pattern' };
      }
    }
    const timeout = call.args.timeout || 30000;

    if (this.dryRun) {
      return { id: call.id, tool: call.tool, output: `[DRY RUN] Would run: ${cmd} (timeout: ${timeout}ms)` };
    }

    if (this.askMode) {
      const approved = await requireApproval({
        type: 'command',
        description: cmd.slice(0, 120),
        details: `Directory: ${this.projectRoot}\nTimeout: ${timeout}ms`,
        risk: cmd.startsWith('rm ') || cmd.startsWith('sudo ') ? 'high' : 'medium',
      });
      if (!approved) {
        return { id: call.id, tool: call.tool, output: '', error: 'Command rejected by user (--ask mode)' };
      }
    }

    const isWin = process.platform === 'win32';
    const winCmdWrappers = new Set(['npm', 'npx', 'pnpm', 'yarn', 'next', 'vite', 'tsc', 'eslint', 'prettier', 'gh', 'code', 'docker', 'docker-compose']);
    const needsShell = isWin && winCmdWrappers.has(first);
    const spawnBin = needsShell ? `${first}.cmd` : first;
    const args = parts.slice(1);

    try {
      const result = spawnSync(spawnBin, args, {
        cwd: this.projectRoot,
        timeout,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024,
        shell: needsShell,
        env: sanitizeEnv(),
      });

      if (result.error) throw result.error;
      if (result.status !== 0) {
        const stderr = result.stderr?.trim() || result.stdout?.trim() || '';
        return { id: call.id, tool: call.tool, output: stderr, error: `Exit code: ${result.status}` };
      }
      return { id: call.id, tool: call.tool, output: result.stdout?.trim() || '(no output)' };
    } catch (e: any) {
      return { id: call.id, tool: call.tool, output: e.message, error: `Exit code: ${e.status || 1}` };
    }
  }

  async undoLastWrite(): Promise<string[]> {
    const undone: string[] = [];
    for (const [filePath, content] of this.fileHistory) {
      if (content !== undefined) {
        fs.writeFileSync(filePath, content, 'utf-8');
        undone.push(filePath);
      }
    }
    this.fileHistory.clear();
    return undone;
  }
}

export function formatToolCallForPrompt(): string {
  return TOOL_DEFINITIONS.map(t => {
    const params = Object.entries(t.parameters).map(([k, v]: [string, any]) =>
      `  ${k}: ${v.description}${v.type === 'number' ? ' (number)' : ''}`
    ).join('\n');
    return `## ${t.name}\n${t.description}\nParameters:\n${params}`;
  }).join('\n\n');
}
