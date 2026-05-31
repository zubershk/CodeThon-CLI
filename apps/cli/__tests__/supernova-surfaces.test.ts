import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { computeAnalytics } from '../src/commands/analytics';
import { buildRepositoryGraph } from '../src/commands/graph';
import type { ExecutionRunMeta } from '../src/journal/execution-journal';
import type { RuntimeEvent } from '../src/events/types';

describe('Supernova surfaces', () => {
  it('computes execution analytics from journals', () => {
    const runs: ExecutionRunMeta[] = [
      {
        runId: 'one',
        goal: 'build auth',
        command: 'auto',
        cwd: process.cwd(),
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:01:00.000Z',
        status: 'completed',
      },
      {
        runId: 'two',
        goal: 'fix tests',
        command: 'auto',
        cwd: process.cwd(),
        startedAt: '2026-01-01T00:00:00.000Z',
        completedAt: '2026-01-01T00:02:00.000Z',
        status: 'failed',
      },
    ];
    const events: RuntimeEvent[][] = [
      [
        { id: '1', runId: 'one', type: 'FILE_UPDATED', timestamp: runs[0].startedAt, message: 'file', target: 'auth.ts' },
        { id: '2', runId: 'one', type: 'COMMAND_EXECUTED', timestamp: runs[0].startedAt, message: 'test' },
        { id: '3', runId: 'one', type: 'CHECKPOINT_CREATED', timestamp: runs[0].startedAt, message: 'checkpoint' },
      ],
      [
        { id: '4', runId: 'two', type: 'COMMAND_FAILED', timestamp: runs[1].startedAt, message: 'test failed' },
      ],
    ];

    const summary = computeAnalytics(runs, events);

    expect(summary.totalRuns).toBe(2);
    expect(summary.completedRuns).toBe(1);
    expect(summary.successRate).toBe(50);
    expect(summary.averageDurationSeconds).toBe(90);
    expect(summary.filesChanged).toBe(1);
    expect(summary.commandFailures).toBe(1);
  });

  it('builds a repository graph from local files', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'codethon-graph-'));
    try {
      fs.mkdirSync(path.join(root, 'app', 'api', 'users'), { recursive: true });
      fs.mkdirSync(path.join(root, 'components'), { recursive: true });
      fs.mkdirSync(path.join(root, 'lib'), { recursive: true });
      fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({
        dependencies: { next: 'latest', react: 'latest' },
        devDependencies: { typescript: 'latest' },
      }));
      fs.writeFileSync(path.join(root, 'app', 'page.tsx'), 'export default function Page() { return null; }');
      fs.writeFileSync(path.join(root, 'app', 'api', 'users', 'route.ts'), 'export function GET() {}');
      fs.writeFileSync(path.join(root, 'components', 'Card.tsx'), 'export function Card() { return null; }');
      fs.writeFileSync(path.join(root, 'lib', 'db.ts'), 'export const db = {};');

      const graph = await buildRepositoryGraph(root);

      expect(graph.techStack).toContain('Next.js');
      expect(graph.routes).toContain('app/page.tsx');
      expect(graph.apiRoutes).toContain('app/api/users/route.ts');
      expect(graph.components).toContain('components/Card.tsx');
      expect(graph.dataFiles).toContain('lib/db.ts');
      expect(graph.dependencies).toContain('typescript');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
