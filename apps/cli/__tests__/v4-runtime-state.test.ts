import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { buildExecutionContextSnapshot, formatExecutionContextForPrompt } from '../src/context/execution-context';
import type { RuntimeEvent } from '../src/events/types';
import {
  appendV4ModelToken,
  createInitialV4RuntimeState,
  reduceV4RuntimeEvent,
  setV4Drawer,
} from '../src/tui/v4-state';

function event(partial: Partial<RuntimeEvent> & Pick<RuntimeEvent, 'type' | 'message'>): RuntimeEvent {
  return {
    id: partial.id || `${partial.type}-${Math.random()}`,
    runId: partial.runId || 'run-v4',
    timestamp: partial.timestamp || '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('V4 runtime workspace state', () => {
  it('reduces runtime events into mission, activity, metrics, and agent state', () => {
    let state = createInitialV4RuntimeState({
      sessionId: 'session-142',
      goal: 'Build auth',
      command: 'auto',
      cwd: process.cwd(),
      projectName: 'Credensa',
      model: 'GPT-5',
      provider: 'OpenAI',
    });

    state = reduceV4RuntimeEvent(state, event({
      type: 'TASK_STARTED',
      message: 'Started auto: Build auth',
      state: 'ANALYZING',
    }));
    state = reduceV4RuntimeEvent(state, event({
      type: 'PLAN_CREATED',
      message: 'Planning step 1',
      state: 'PLANNING',
      iteration: 1,
    }));
    state = reduceV4RuntimeEvent(state, event({
      type: 'CONTEXT_BUILT',
      message: 'Credensa: Next.js · 2 task-relevant files selected',
      state: 'BUILDING_CONTEXT',
      data: {
        snapshot: {
          generatedAt: '2026-01-01T00:00:00.000Z',
          root: process.cwd(),
          projectName: 'Credensa',
          goal: 'Build auth',
          techStack: ['Next.js'],
          keyFiles: ['package.json'],
          candidateFiles: ['app/api/auth.ts', 'package.json'],
          changedFiles: ['app/api/auth.ts'],
          scripts: ['typecheck: tsc --noEmit'],
          dependencies: ['next'],
          memoryEntries: ['decision: use Supabase auth'],
          tokenEstimate: 800,
          contextPercent: 1,
          summary: 'Credensa context built',
        },
      },
    }));
    state = reduceV4RuntimeEvent(state, event({
      type: 'TOOL_STARTED',
      message: 'read file: app/api/auth.ts',
      state: 'UNDERSTANDING_REPOSITORY',
      tool: 'read_file',
      target: 'app/api/auth.ts',
    }));
    state = reduceV4RuntimeEvent(state, event({
      type: 'FILE_UPDATED',
      message: 'Updated app/api/auth.ts',
      state: 'EXECUTING',
      tool: 'write_file',
      target: 'app/api/auth.ts',
    }));
    state = reduceV4RuntimeEvent(state, event({
      type: 'COMMAND_EXECUTED',
      message: 'npm run typecheck passed',
      state: 'VERIFYING',
      tool: 'run_command',
      target: 'npm run typecheck',
      durationMs: 1200,
    }));
    state = reduceV4RuntimeEvent(state, event({
      type: 'CHECKPOINT_CREATED',
      message: 'Checkpoint saved: tool-result',
      state: 'CHECKPOINTING',
    }));

    expect(state.missionFeed.some(item => item.role === 'Planner')).toBe(true);
    expect(state.activityFeed).toHaveLength(7);
    expect(state.context.files).toContain('app/api/auth.ts');
    expect(state.context.memory).toContain('decision: use Supabase auth');
    expect(state.diffs[0].file).toBe('app/api/auth.ts');
    expect(state.metrics.filesModified).toBe(1);
    expect(state.metrics.commandsRun).toBe(1);
    expect(state.metrics.checkpoints).toBe(1);
    expect(state.agents.find(agent => agent.name === 'QA')?.status).toBe('complete');
  });

  it('tracks model stream tokens and drawer selection without mutating previous state', () => {
    const initial = createInitialV4RuntimeState({
      sessionId: 'session-143',
      goal: 'Fix tests',
      command: 'auto',
      cwd: process.cwd(),
      model: 'deepseek-v4-flash',
      provider: 'NVIDIA',
    });

    const withTokens = appendV4ModelToken(initial, 'I will inspect the failing tests and then run typecheck.');
    const withToolMarkup = appendV4ModelToken(withTokens, '<TOOL_CALL>{"id":"1","tool":"read_file","args":{"path":"package.json"}}</TOOL_CALL>Then I will verify the result.');
    const withOrphanToolMarkup = appendV4ModelToken(withToolMarkup, ' tool":"list_directory","args":{"path":"."}} read_file","args":{"path":"package.json"}}');
    const withDrawer = setV4Drawer(withOrphanToolMarkup, 'context');

    expect(initial.liveModelText).toBe('');
    expect(withTokens.liveModelText).toContain('inspect the failing tests');
    expect(withToolMarkup.liveModelText).not.toContain('TOOL_CALL');
    expect(withToolMarkup.liveModelText).not.toContain('"tool"');
    expect(withToolMarkup.liveModelText).toContain('Then I will verify the result.');
    expect(withOrphanToolMarkup.liveModelText).not.toContain('list_directory');
    expect(withOrphanToolMarkup.liveModelText).not.toContain('read_file","args"');
    expect(withTokens.metrics.tokensOut).toBeGreaterThan(0);
    expect(withDrawer.activeDrawer).toBe('context');
    expect(withToolMarkup.activeDrawer).toBeNull();
  });

  it('builds a prompt-safe execution context snapshot without env contents', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codethon-v4-context-'));
    try {
      fs.mkdirSync(path.join(root, 'app', 'api', 'auth'), { recursive: true });
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
        scripts: { typecheck: 'tsc --noEmit' },
        dependencies: { next: 'latest', react: 'latest' },
        devDependencies: { typescript: 'latest' },
      }));
      fs.writeFileSync(path.join(root, 'app', 'api', 'auth', 'route.ts'), 'export function POST() {}');
      fs.writeFileSync(path.join(root, '.env'), 'SECRET_KEY=do-not-read');

      const snapshot = await buildExecutionContextSnapshot('build auth route', root);
      const prompt = formatExecutionContextForPrompt(snapshot);

      expect(snapshot.techStack).toContain('Next.js');
      expect(snapshot.candidateFiles).toContain('app/api/auth/route.ts');
      expect(snapshot.keyFiles).not.toContain('.env');
      expect(prompt).toContain('Task-Relevant Files');
      expect(prompt).not.toContain('do-not-read');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
