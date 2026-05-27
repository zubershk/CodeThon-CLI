import type { ExecutionRecord } from '@codethon/shared-types';
import { StateManager } from './state-manager';

export class ExecutionTracker {
  private state: StateManager;

  constructor() {
    this.state = new StateManager();
  }

  recordExecution(
    command: string,
    success: boolean,
    duration: number,
    output: string,
    suggestedBy: string | null = null,
  ): void {
    const project = this.state.getProjectOrThrow();
    const record: ExecutionRecord = {
      command,
      timestamp: new Date().toISOString(),
      success,
      duration,
      output: output.slice(0, 500),
      suggestedBy,
    };
    project.executionLog.push(record);
    this.state.updateProject({ executionLog: project.executionLog });
  }

  getRecentExecutions(n = 10): ExecutionRecord[] {
    const project = this.state.getProject();
    if (!project) return [];
    return [...project.executionLog]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, n);
  }

  getFailureRate(): number {
    const project = this.state.getProject();
    if (!project || project.executionLog.length === 0) return 0;
    const failures = project.executionLog.filter((r) => !r.success).length;
    return Math.round((failures / project.executionLog.length) * 100);
  }

  getCommonFailures(): { command: string; count: number }[] {
    const project = this.state.getProject();
    if (!project) return [];

    const failureMap = new Map<string, number>();
    for (const record of project.executionLog) {
      if (!record.success) {
        const base = record.command.split(/\s+/)[0];
        failureMap.set(base, (failureMap.get(base) || 0) + 1);
      }
    }

    return Array.from(failureMap.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count);
  }

  getSuggestedCommandAdherence(): number {
    const project = this.state.getProject();
    if (!project) return 0;

    const suggested = project.executionLog.filter((r) => r.suggestedBy !== null);
    if (suggested.length === 0) return 0;

    const succeeded = suggested.filter((r) => r.success).length;
    return Math.round((succeeded / suggested.length) * 100);
  }

  getTotalExecutions(): number {
    return this.state.getProject()?.executionLog.length || 0;
  }
}
