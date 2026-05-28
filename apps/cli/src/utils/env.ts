import { spawnSync } from 'child_process';

const SENSITIVE_PATTERNS: RegExp[] = [
  /^API[_-]?KEY/i,
  /^SECRET/i,
  /^TOKEN/i,
  /^PASSWORD/i,
  /^PASSWD/i,
  /^PRIVATE[_-]?KEY/i,
  /^ACCESS[_-]?KEY/i,
  /^AWS[_-]?(SECRET|ACCESS)/i,
  /^OPENAI[_-]?API[_-]?KEY/i,
  /^ANTHROPIC[_-]?API[_-]?KEY/i,
  /^NVIDIA[_-]?API[_-]?KEY/i,
  /^CODETHON[_-]?API[_-]?KEY/i,
  /^HUGGING[_-]?FACE/i,
  /^REPLICATE[_-]?API/i,
  /^GOOGLE[_-]?API[_-]?KEY/i,
  /^AZURE[_-]?(OPENAI|API)/i,
  /^DB[_-]?(URL|CONNECT)/i,
  /^MONGO[_-]?(URI|URL)/i,
  /^REDIS[_-]?URL/i,
  /^JWT[_-]?SECRET/i,
  /^SESSION[_-]?SECRET/i,
  /^COOKIE[_-]?SECRET/i,
  /^CF[_-]?(API|ACCESS)/i,
  /^DIGITALOCEAN/i,
  /^LINODE/i,
  /^VULTR/i,
];

const KEEP_VARS = new Set([
  'PATH', 'HOME', 'USER', 'USERNAME', 'HOSTNAME', 'COMPUTERNAME',
  'TEMP', 'TMP', 'TMPDIR',
  'SystemRoot', 'COMSPEC', 'PATHEXT', 'PROCESSOR_ARCHITECTURE',
  'NODE_ENV', 'NODE_PATH', 'npm_config_user_agent',
  'SHELL', 'TERM', 'TERMINAL', 'COLORTERM',
  'LANG', 'LC_ALL', 'LC_CTYPE',
  'PWD', 'OLDPWD',
  'EDITOR', 'VISUAL',
]);

export function sanitizeEnv(): NodeJS.ProcessEnv {
  const safe: NodeJS.ProcessEnv = {};

  for (const key of KEEP_VARS) {
    if (process.env[key] !== undefined) {
      safe[key] = process.env[key];
    }
  }

  for (const key of Object.keys(process.env)) {
    if (KEEP_VARS.has(key)) continue;
    let sensitive = false;
    for (const pat of SENSITIVE_PATTERNS) {
      if (pat.test(key)) { sensitive = true; break; }
    }
    if (!sensitive) {
      safe[key] = process.env[key];
    }
  }

  return safe;
}

const WIN_CMD_WRAPPERS = new Set([
  'npm', 'npx', 'pnpm', 'yarn', 'next',
  'tsc', 'eslint', 'prettier', 'gh', 'code',
  'docker', 'docker-compose',
  'python', 'pip',
  'nslookup', 'ping', 'tracert', 'ipconfig', 'systeminfo',
]);

export function resolveBin(bin: string): string {
  if (process.platform === 'win32' && WIN_CMD_WRAPPERS.has(bin)) {
    return `${bin}.cmd`;
  }
  return bin;
}

export function spawnCommand(
  command: string,
  options: {
    cwd?: string;
    timeout?: number;
    encoding?: BufferEncoding;
    maxBuffer?: number;
    sanitize?: boolean;
  } = {},
): { stdout: string; stderr: string; status: number | null; error?: Error } {
  const parts = command.split(/\s+/);
  const bin = resolveBin(parts[0]);
  const args = parts.slice(1);

  const needsShell = process.platform === 'win32' && (WIN_CMD_WRAPPERS.has(parts[0]) || bin.endsWith('.cmd'));
  try {
    const result = spawnSync(bin, args, {
      cwd: options.cwd ?? process.cwd(),
      timeout: options.timeout ?? 30000,
      encoding: options.encoding ?? 'utf-8',
      maxBuffer: options.maxBuffer ?? 1024 * 1024,
      shell: needsShell,
      env: options.sanitize !== false ? sanitizeEnv() : undefined,
    });

    return {
      stdout: (result.stdout ?? '') as string,
      stderr: (result.stderr ?? '') as string,
      status: result.status,
      error: result.error ?? undefined,
    };
  } catch (e: any) {
    return { stdout: '', stderr: e.message, status: e.status ?? 1, error: e };
  }
}
