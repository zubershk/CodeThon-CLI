import crypto from 'crypto';
import path from 'path';
import type { ExecutionRunMeta } from '../journal/execution-journal';

export class SessionManager {
  constructor(private readonly cwd: string) {}

  create(command: string, goal: string): ExecutionRunMeta {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const suffix = crypto.randomBytes(3).toString('hex');
    return {
      runId: `${stamp}-${suffix}`,
      command,
      goal,
      cwd: path.resolve(this.cwd),
      startedAt: new Date().toISOString(),
      status: 'running',
    };
  }
}
