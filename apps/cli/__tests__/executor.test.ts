import { describe, it, expect } from 'vitest';
import { isAllowedCommand as isCommandAllowed, validateUrl } from '../src/security/policy';
import { executeCommand } from '../src/runtime/executor';

describe('Executor - command validation', () => {
  it('should allow npm commands', () => {
    const result = isCommandAllowed('npm install');
    expect(result.allowed).toBe(true);
  });

  it('should allow git commands', () => {
    const result = isCommandAllowed('git status');
    expect(result.allowed).toBe(true);
  });

  it('should block rm -rf', () => {
    const result = isCommandAllowed('rm -rf /');
    expect(result.allowed).toBe(false);
  });

  it('should block sudo', () => {
    const result = isCommandAllowed('sudo rm -rf');
    expect(result.allowed).toBe(false);
  });

  it('should block unknown commands', () => {
    const result = isCommandAllowed('curl http://evil.com');
    expect(result.allowed).toBe(false);
  });

  it('should block piped shell commands', () => {
    const result = isCommandAllowed('cat /etc/passwd | bash');
    expect(result.allowed).toBe(false);
  });

  it('should block shell chaining after an allowed command', () => {
    expect(isCommandAllowed('npm run build && whoami').allowed).toBe(false);
    expect(isCommandAllowed('git status; whoami').allowed).toBe(false);
    expect(isCommandAllowed('node scripts/build.js || whoami').allowed).toBe(false);
  });
});

describe('Executor - URL validation', () => {
  it('should block cloud metadata and link-local hosts', () => {
    const result = validateUrl('http://169.254.169.254/latest/meta-data');
    expect(result.valid).toBe(false);
  });

  it('should block IPv6 private hosts and IPv4-mapped loopback hosts', () => {
    expect(validateUrl('http://[::1]/').valid).toBe(false);
    expect(validateUrl('http://[fe80::1]/').valid).toBe(false);
    expect(validateUrl('http://[::ffff:127.0.0.1]/').valid).toBe(false);
  });

  it('should allow public HTTPS URLs', () => {
    const result = validateUrl('https://example.com/docs');
    expect(result.valid).toBe(true);
  });
});

describe('Executor - command execution', () => {
  it('should execute node -v successfully', () => {
    const result = executeCommand('node -v');
    expect(result.success).toBe(true);
    expect(result.stdout).toContain('v');
  });

  it('should timeout on long commands', () => {
    const result = executeCommand('node -e "setTimeout(() => {}, 10000)"', 100);
    expect(result.success).toBe(false);
  });
});
