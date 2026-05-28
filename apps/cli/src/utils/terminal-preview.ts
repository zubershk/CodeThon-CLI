import { spawn } from 'child_process';
import chalk from 'chalk';
import readline from 'readline';
import { sanitizeEnv, resolveBin } from './env';

const ALLOWED_COMMANDS = [
  'npm', 'pnpm', 'yarn', 'git', 'node', 'npx', 'next', 'vite', 'tsc', 'eslint', 'prettier',
  'find', 'ls', 'dir', 'cat', 'type', 'echo', 'python', 'python3', 'pip', 'pip3',
  'powershell', 'pwsh', 'cmd', 'code', 'docker', 'docker-compose',
  'gh', 'tar', 'unzip', 'gzip', 'mkdir', 'cp', 'mv', 'cd', 'touch', 'pwd', 'date', 'whoami',
  'nslookup', 'ping', 'tracert', 'ipconfig', 'systeminfo',
];
const BLOCKED_PATTERNS = [/rm\s+-rf/i, /sudo/i, /curl/i, /wget/i, />\s*\//i, /\|\s*(bash|sh|powershell)/i, /chmod/i, /chown/i, /mkfs/i, /dd\s+if/i, /:\(\)\s*\{/i];

export interface PreviewResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export class TerminalPreview {
  private lines: string[] = [];
  private abortController: AbortController | null = null;

  async run(
    command: string,
    cwd: string,
    onLine?: (line: string, stream: 'stdout' | 'stderr') => void,
    timeoutMs = 60000
  ): Promise<PreviewResult> {
    this.abortController = new AbortController();
    this.lines = [];

    if (!this.isAllowed(command)) {
      const msg = `Blocked: ${command.split(/\s+/)[0]} is not in allowed list`;
      onLine?.(msg, 'stderr');
      return { success: false, stdout: '', stderr: msg, exitCode: 1 };
    }

    return new Promise((resolve) => {
      const parts = command.split(/\s+/);
      const bin = parts[0];
      const args = parts.slice(1);

      const needsShell = process.platform === 'win32' && resolveBin(bin).endsWith('.cmd');
      const proc = spawn(needsShell ? bin : resolveBin(bin), args, {
        cwd,
        shell: needsShell,
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: this.abortController!.signal,
        env: sanitizeEnv(),
      });

      let stdout = '';
      let stderr = '';
      let resolved = false;

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          proc.kill('SIGTERM');
          resolve({ success: false, stdout, stderr: stderr + '\n[TIMEOUT] Command exceeded ' + timeoutMs + 'ms', exitCode: null });
        }
      }, timeoutMs);

      const handleLine = (stream: 'stdout' | 'stderr') => (line: string) => {
        const trimmed = line.replace(/\r?\n$/, '');
        this.lines.push(trimmed);
        onLine?.(trimmed, stream);
        if (stream === 'stdout') stdout += trimmed + '\n';
        else stderr += trimmed + '\n';
      };

      const rlOut = readline.createInterface({ input: proc.stdout! });
      const rlErr = readline.createInterface({ input: proc.stderr! });
      rlOut.on('line', handleLine('stdout'));
      rlErr.on('line', handleLine('stderr'));

      proc.on('close', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          rlOut.close();
          rlErr.close();
          resolve({ success: code === 0, stdout, stderr, exitCode: code });
        }
      });

      proc.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve({ success: false, stdout, stderr: err.message, exitCode: 1 });
        }
      });
    });
  }

  cancel(): void {
    this.abortController?.abort();
  }

  private isAllowed(command: string): boolean {
    const first = command.split(/\s+/)[0];
    if (!ALLOWED_COMMANDS.includes(first)) return false;
    for (const p of BLOCKED_PATTERNS) {
      if (p.test(command)) return false;
    }
    return true;
  }
}

export function renderTerminalBox(title: string): void {
  const bar = chalk.bold.gray('\u2500'.repeat(50));
  console.log(`  ${chalk.bold.cyanBright('\u25A3')}  ${chalk.bold.whiteBright(title)}`);
  console.log(`  ${bar}`);
  console.log(`  ${chalk.dim('\u2503')}`);
}

export function renderTerminalLine(line: string, stream: 'stdout' | 'stderr'): void {
  if (stream === 'stderr') {
    console.log(`  ${chalk.dim('\u2503')} ${chalk.redBright(line)}`);
  } else {
    console.log(`  ${chalk.dim('\u2503')} ${chalk.whiteBright(line)}`);
  }
}

export function renderTerminalClose(result: PreviewResult): void {
  const bar = chalk.bold.gray('\u2500'.repeat(50));
  const status = result.success
    ? chalk.greenBright(`\u2713 Exited with code ${result.exitCode}`)
    : chalk.redBright(`\u2717 Exited with code ${result.exitCode ?? 'TIMEOUT'}`);
  console.log(`  ${chalk.dim('\u2503')}`);
  console.log(`  ${status}`);
  console.log(`  ${bar}`);
  console.log('');
}
