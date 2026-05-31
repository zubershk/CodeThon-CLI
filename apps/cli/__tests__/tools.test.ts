import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { ToolExecutor } from '../src/cil/tools';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TEST_DIR = path.join(os.tmpdir(), 'codethon-tools-test-' + Date.now());

describe('ToolExecutor - dry-run mode', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
    executor = new ToolExecutor(TEST_DIR, false, true);
  });

  afterAll(() => {
    try { fs.rmSync(TEST_DIR, { recursive: true, force: true }); } catch { /* */ }
  });

  it('should not write files in dry-run mode', async () => {
    const result = await executor.execute({
      id: '1', tool: 'write_file',
      args: { path: 'test.txt', content: 'hello' },
    });
    expect(result.output).toContain('[DRY RUN]');
    expect(result.output).toContain('test.txt');
    expect(fs.existsSync(path.join(TEST_DIR, 'test.txt'))).toBe(false);
  });

  it('should not run commands in dry-run mode', async () => {
    const result = await executor.execute({
      id: '1', tool: 'run_command',
      args: { command: 'node -v' },
    });
    expect(result.output).toContain('[DRY RUN]');
    expect(result.output).toContain('node -v');
  });

  it('should still allow reads in dry-run mode', async () => {
    fs.writeFileSync(path.join(TEST_DIR, 'existing.txt'), 'content');
    const result = await executor.execute({
      id: '1', tool: 'read_file',
      args: { path: 'existing.txt' },
    });
    expect(result.error).toBeUndefined();
    expect(result.output).toContain('content');
  });
});

describe('ToolExecutor - write operations', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
    executor = new ToolExecutor(TEST_DIR);
  });

  it('should write files and report bytes', async () => {
    const result = await executor.execute({
      id: '1', tool: 'write_file',
      args: { path: 'hello.txt', content: 'Hello, World!' },
    });
    expect(result.error).toBeUndefined();
    expect(result.output).toContain('hello.txt');
    expect(result.output).toContain('13 bytes');
    expect(fs.readFileSync(path.join(TEST_DIR, 'hello.txt'), 'utf-8')).toBe('Hello, World!');
  });

  it('should create subdirectories when writing', async () => {
    const result = await executor.execute({
      id: '1', tool: 'write_file',
      args: { path: 'sub/dir/file.txt', content: 'nested' },
    });
    expect(result.error).toBeUndefined();
    expect(fs.existsSync(path.join(TEST_DIR, 'sub/dir/file.txt'))).toBe(true);
  });

  it('should reject path traversal', async () => {
    const result = await executor.execute({
      id: '1', tool: 'write_file',
      args: { path: '../escape.txt', content: 'should not write' },
    });
    expect(result.error).toContain('escapes project root');
  });

  it('should reject sibling-prefix path traversal', async () => {
    const baseDir = path.join(os.tmpdir(), 'codethon-prefix-bypass-' + Date.now());
    const projectDir = path.join(baseDir, 'project');
    const siblingDir = path.join(baseDir, 'project-evil');
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(siblingDir, { recursive: true });
    fs.writeFileSync(path.join(siblingDir, 'secret.txt'), 'secret');

    const siblingExecutor = new ToolExecutor(projectDir);
    const result = await siblingExecutor.execute({
      id: '1',
      tool: 'read_file',
      args: { path: '../project-evil/secret.txt' },
    });

    expect(result.error).toContain('escapes project root');
    fs.rmSync(baseDir, { recursive: true, force: true });
  });
});

describe('ToolExecutor - malformed model arguments', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
    executor = new ToolExecutor(TEST_DIR);
  });

  it('should return a clear read_file error instead of throwing for missing paths', async () => {
    const result = await executor.execute({
      id: '1', tool: 'read_file',
      args: { paths: [undefined] },
    });

    expect(result.output).toBe('');
    expect(result.error).toContain('read_file needs a file path');
  });
});

describe('ToolExecutor - run command validation', () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    if (!fs.existsSync(TEST_DIR)) fs.mkdirSync(TEST_DIR, { recursive: true });
    executor = new ToolExecutor(TEST_DIR);
  });

  it('should block disallowed commands', async () => {
    const result = await executor.execute({
      id: '1', tool: 'run_command',
      args: { command: 'curl http://evil.com' },
    });
    expect(result.error).toContain('not allowed');
  });

  it('should reject rm (not in allowed)', async () => {
    const result = await executor.execute({
      id: '1', tool: 'run_command',
      args: { command: 'rm -rf /' },
    });
    expect(result.error).toContain('not allowed');
  });

  it('should block blocked patterns for allowed commands', async () => {
    const result = await executor.execute({
      id: '1', tool: 'run_command',
      args: { command: 'git push origin main --force && rm -rf /' },
    });
    expect(result.error).toContain('blocked');
  });

  it('should block shell-control operators for allowed commands', async () => {
    const result = await executor.execute({
      id: '1', tool: 'run_command',
      args: { command: 'npm run build && whoami' },
    });
    expect(result.error).toContain('blocked');
  });
});
