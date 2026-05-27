import { execSync } from 'child_process';

const ALLOWED_COMMANDS = [
  'npm', 'pnpm', 'yarn', 'bun',
  'git',
  'node', 'npx', 'tsx', 'ts-node',
  'next', 'vite', 'astro', 'nuxt', 'svelte',
  'tsc', 'eslint', 'prettier', 'stylelint',
  'vitest', 'jest', 'mocha', 'ava', 'tape',
  'tailwindcss', 'postcss',
  'prisma', 'drizzle',
  'supabase', 'firebase',
  'vercel', 'netlify', 'aws',
  'docker', 'docker-compose',
  'python', 'python3', 'pip', 'pip3',
  'cargo', 'go', 'make',
  'cat', 'ls', 'dir', 'find', 'grep', 'type',
  'echo', 'mkdir', 'cp', 'mv', 'touch', 'rm',
  'pwd', 'date', 'whoami',
  'code', 'gh',
  'ffmpeg', 'yt-dlp',
];

const BLOCKED_PATTERNS = [
  /rm\s+-rf/i,
  /sudo/i,
  /su\s/i,
  /chmod/i,
  /chown/i,
  /mkfs/i,
  /dd\s+if/i,
  />\s*\//i,
  /\|\s*(bash|sh|powershell|cmd)/i,
  /:\(\)\s*\{/i,
  /(curl|wget)\s+/i,
];

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function isCommandAllowed(command: string): { allowed: boolean; reason?: string } {
  const normalized = command.trim().replace(/^"|^'/, '');
  const firstWord = normalized.split(/\s+/)[0].toLowerCase();

  if (!ALLOWED_COMMANDS.includes(firstWord)) {
    return { allowed: false, reason: `Command '${firstWord}' is not in the allowed list` };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return { allowed: false, reason: `Command matches blocked pattern: ${pattern}` };
    }
  }

  return { allowed: true };
}

export function executeCommand(command: string, timeoutMs = 30000): ExecResult {
  const check = isCommandAllowed(command);
  if (!check.allowed) {
    return { success: false, stdout: '', stderr: check.reason || 'Command not allowed', exitCode: 1 };
  }

  try {
    const stdout = execSync(command, {
      timeout: timeoutMs,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
    });
    return { success: true, stdout: stdout.trim(), stderr: '', exitCode: 0 };
  } catch (error: unknown) {
    if (error instanceof Error) {
      const err = error as Error & { stderr?: string; stdout?: string; status?: number };
      return {
        success: false,
        stdout: err.stdout?.toString() || '',
        stderr: err.stderr?.toString() || err.message,
        exitCode: err.status ?? 1,
      };
    }
    return { success: false, stdout: '', stderr: 'Unknown execution error', exitCode: 1 };
  }
}

export function setAllowedCommands(commands: string[]): void {
  ALLOWED_COMMANDS.length = 0;
  ALLOWED_COMMANDS.push(...commands);
}
