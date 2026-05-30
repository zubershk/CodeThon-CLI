// Single source of truth for execution permissions
// Used by both executor.ts (runtime) and tools.ts (agent)

export const ALLOWED_BINS = new Set([
  'npm', 'npx', 'node', 'git', 'pnpm', 'yarn',
  'next', 'vite', 'tsc', 'prettier',
  'find', 'ls', 'dir', 'cat', 'type', 'echo',
  'mkdir', 'cp', 'mv', 'touch', 'pwd', 'date', 'whoami',
  'gh', 'tar', 'unzip', 'gzip',
]);

export const ALLOWED_COMMANDS = [
  'npm', 'pnpm', 'yarn', 'bun',
  'git',
  'node', 'npx', 'tsx',
  'next', 'vite', 'astro', 'nuxt', 'svelte',
  'tsc', 'prettier',
  'vitest', 'jest',
  'tailwindcss', 'postcss',
  'prisma', 'drizzle',
  'supabase', 'vercel',
  'cat', 'ls', 'dir', 'find', 'grep', 'type',
  'echo', 'mkdir', 'cp', 'mv', 'touch', 'pwd', 'date', 'whoami',
  'code', 'gh',
];

export const BLOCKED_PATTERNS = [
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

export function isAllowedBinary(bin: string): boolean {
  return ALLOWED_BINS.has(bin.toLowerCase());
}

export function isAllowedCommand(command: string): { allowed: boolean; reason?: string } {
  const normalized = command.trim().replace(/^"|^'/, '');
  const firstWord = normalized.split(/\s+/)[0].toLowerCase();

  if (!ALLOWED_COMMANDS.includes(firstWord)) {
    return { allowed: false, reason: `Command '${firstWord}' not in allowlist` };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(command)) {
      return { allowed: false, reason: `Blocked pattern: ${pattern}` };
    }
  }

  return { allowed: true };
}

// SSRF guard — reject private/internal IP ranges
const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^0\./,
  /^::1$/,
  /^localhost$/i,
];

export function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/\[|\]/g, '');
  if (lower === 'localhost' || lower === '127.0.0.1' || lower === '::1' || lower === '0.0.0.0') return true;
  for (const r of PRIVATE_RANGES) {
    if (r.test(lower)) return true;
  }
  return false;
}

export function validateUrl(raw: string): { valid: boolean; reason?: string } {
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    return { valid: false, reason: 'URL must start with http:// or https://' };
  }
  try {
    const url = new URL(raw);
    if (isPrivateHost(url.hostname)) {
      return { valid: false, reason: `Private network host blocked: ${url.hostname}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL' };
  }
}
