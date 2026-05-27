import { describe, it, expect } from 'vitest';
import { isCommandAllowed, executeCommand } from '../src/runtime/executor';

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
