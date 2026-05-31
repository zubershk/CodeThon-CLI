import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  responses: [] as string[],
}));

vi.mock('../src/utils/config', () => ({
  getLLMConfig: () => ({
    provider: 'openai',
    apiKey: 'test-key',
    model: 'test-model',
    temperature: 0.3,
    maxTokens: 4000,
  }),
  validateProviderConfig: () => ({ ok: true }),
}));

vi.mock('../src/llm/index', () => ({
  createProvider: () => ({
    generate: async () => ({
      content: mockState.responses.shift() || 'DONE: fallback completion',
    }),
  }),
  LLMRouter: class {},
  CostTracker: class {},
}));

import { JobLoop } from '../src/cil/job-loop';

let testDir = '';

describe('JobLoop completion evidence', () => {
  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codethon-job-loop-'));
    mockState.responses = [
      'TOOL_CALL: {"id":"1","tool":"write_file","args":{"path":"zuber.txt","content":"Full stack resume content"}}',
    ];
  });

  afterEach(() => {
    if (testDir) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('marks a simple file deliverable complete after the write succeeds', async () => {
    const statuses: Array<{ phase: string; done: boolean; description: string; error?: string }> = [];
    const loop = new JobLoop(testDir, 5);

    const result = await loop.execute('make a txt file named zuber.txt', status => {
      statuses.push({
        phase: status.phase,
        done: status.done,
        description: status.description,
        error: status.error,
      });
    });

    expect(result.success).toBe(true);
    expect(result.iterations).toBe(1);
    expect(result.summary).toContain('zuber.txt');
    expect(result.receipt?.reason).toBe('artifact_verified');
    expect(result.receipt?.artifacts.some(artifact => artifact.path === 'zuber.txt')).toBe(true);
    expect(fs.readFileSync(path.join(testDir, 'zuber.txt'), 'utf-8')).toBe('Full stack resume content');
    expect(statuses.some(status => status.phase === 'done' && status.done && !status.error)).toBe(true);
  });

  it('does not claim verified workflow completion until verification evidence exists', async () => {
    mockState.responses = [
      'TOOL_CALL: {"id":"1","tool":"write_file","args":{"path":"README.md","content":"# Demo"}}',
      'DONE: README was written, but build verification was not requested by the model in this test.',
    ];
    const loop = new JobLoop(testDir, 5);

    const result = await loop.execute('build the project and add a readme file');

    expect(result.success).toBe(true);
    expect(result.iterations).toBe(2);
    expect(result.receipt?.reason).toBe('model_done');
    expect(fs.readFileSync(path.join(testDir, 'README.md'), 'utf-8')).toBe('# Demo');
  });
});
