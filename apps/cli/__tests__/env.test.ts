import { describe, it, expect } from 'vitest';
import { sanitizeEnv, resolveBin } from '../src/utils/env';

describe('sanitizeEnv', () => {
  it('should keep essential vars', () => {
    const orig = { ...process.env };
    process.env.PATH = '/usr/bin';
    process.env.HOME = '/home/user';
    const safe = sanitizeEnv();
    expect(safe.PATH).toBe('/usr/bin');
    expect(safe.HOME).toBe('/home/user');
    Object.assign(process.env, orig);
  });

  it('should strip sensitive vars', () => {
    const orig = { ...process.env };
    process.env.OPENAI_API_KEY = 'sk-1234567890abcdef';
    process.env.SECRET_TOKEN = 'super-secret';
    process.env.AWS_SECRET_ACCESS_KEY = 'dontleakme';
    const safe = sanitizeEnv();
    expect(safe.OPENAI_API_KEY).toBeUndefined();
    expect(safe.SECRET_TOKEN).toBeUndefined();
    expect(safe.AWS_SECRET_ACCESS_KEY).toBeUndefined();
    Object.assign(process.env, orig);
  });

  it('should keep non-sensitive custom vars', () => {
    const orig = { ...process.env };
    process.env.MY_APP_NAME = 'CodeThon';
    process.env.NODE_ENV = 'test';
    const safe = sanitizeEnv();
    expect(safe.MY_APP_NAME).toBe('CodeThon');
    expect(safe.NODE_ENV).toBe('test');
    Object.assign(process.env, orig);
  });
});

describe('resolveBin', () => {
  const origPlatform = process.platform;

  it('should append .cmd for known wrappers on win32', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    expect(resolveBin('npm')).toBe('npm.cmd');
    expect(resolveBin('npx')).toBe('npx.cmd');
    expect(resolveBin('pnpm')).toBe('pnpm.cmd');
    Object.defineProperty(process, 'platform', { value: origPlatform });
  });

  it('should not append .cmd for native exes on win32', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    expect(resolveBin('node')).toBe('node');
    expect(resolveBin('git')).toBe('git');
    Object.defineProperty(process, 'platform', { value: origPlatform });
  });

  it('should return bin as-is on non-windows', () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    expect(resolveBin('npm')).toBe('npm');
    expect(resolveBin('node')).toBe('node');
    Object.defineProperty(process, 'platform', { value: origPlatform });
  });
});
