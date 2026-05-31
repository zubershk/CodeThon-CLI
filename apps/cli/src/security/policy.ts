import dns from 'dns';
import net from 'net';

// Single source of truth for execution permissions
// Used by executor.ts (runtime), tools.ts (agent), and terminal-preview.ts.

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
  /[\r\n]/,
  /[;|`]/,
  /&&|\|\|/,
  /\$\(/,
  /(?:^|\s)&(?:\s|$)/,
  /(?:^|\s)(?:>{1,2}|<)(?:\s|$)/,
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

function normalizeHostname(hostname: string): string {
  return hostname
    .trim()
    .toLowerCase()
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/\.$/, '')
    .split('%')[0];
}

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b, c] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0) ||
    (a === 192 && b === 88 && c === 99) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

function isPrivateIPv6(hostname: string): boolean {
  if (hostname === '::' || hostname === '::1') return true;
  if (hostname.startsWith('::ffff:')) return true;

  const mapped = hostname.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);

  const first = hostname.split(':')[0];
  const firstValue = Number.parseInt(first || '0', 16);
  if (!Number.isFinite(firstValue)) return false;

  return (
    (firstValue & 0xfe00) === 0xfc00 || // unique local fc00::/7
    (firstValue & 0xffc0) === 0xfe80 || // link local fe80::/10
    (firstValue & 0xff00) === 0xff00 // multicast ff00::/8
  );
}

export function isPrivateHost(hostname: string): boolean {
  const lower = normalizeHostname(hostname);
  if (lower === 'localhost' || lower.endsWith('.localhost')) return true;

  const version = net.isIP(lower);
  if (version === 4) return isPrivateIPv4(lower);
  if (version === 6) return isPrivateIPv6(lower);
  return false;
}

export function validateUrl(raw: string): { valid: boolean; reason?: string } {
  if (!/^https?:\/\//i.test(raw)) {
    return { valid: false, reason: 'URL must start with http:// or https://' };
  }
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { valid: false, reason: 'URL must use http or https' };
    }
    if (url.username || url.password) {
      return { valid: false, reason: 'URLs with credentials are not allowed' };
    }
    if (isPrivateHost(url.hostname)) {
      return { valid: false, reason: `Private network host blocked: ${url.hostname}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL' };
  }
}

export async function validateResolvedUrl(raw: string): Promise<{ valid: boolean; reason?: string }> {
  const base = validateUrl(raw);
  if (!base.valid) return base;

  const url = new URL(raw);
  if (net.isIP(normalizeHostname(url.hostname))) return base;

  try {
    const records = await dns.promises.lookup(url.hostname, { all: true, verbatim: false });
    const blocked = records.find((record) => isPrivateHost(record.address));
    if (blocked) {
      return { valid: false, reason: `Private network address blocked: ${blocked.address}` };
    }
    return { valid: true };
  } catch {
    return { valid: false, reason: 'DNS lookup failed' };
  }
}
