import type { CommandResult } from '@codethon/shared-types';
import { ExecutionJournal } from '../journal/execution-journal';
import type { RuntimeEvent } from '../events/types';
import { renderAnalyticsDashboard } from '../ui/supernova';
import type { AnalyticsSummary } from '../ui/supernova';

function runDurationSeconds(run: { startedAt: string; completedAt?: string }): number {
  const end = run.completedAt ? Date.parse(run.completedAt) : Date.now();
  return Math.max(0, Math.floor((end - Date.parse(run.startedAt)) / 1000));
}

export function computeAnalytics(runs: ReturnType<typeof ExecutionJournal.list>, eventsByRun: RuntimeEvent[][]): AnalyticsSummary {
  const totalRuns = runs.length;
  const completedRuns = runs.filter(run => run.status === 'completed').length;
  const failedRuns = runs.filter(run => run.status === 'failed').length;
  const cancelledRuns = runs.filter(run => run.status === 'cancelled').length;
  const allEvents = eventsByRun.flat();
  const uniqueFiles = new Set(allEvents.filter(event => event.type === 'FILE_UPDATED' && event.target).map(event => event.target));
  const commandsExecuted = allEvents.filter(event => event.type === 'COMMAND_EXECUTED' || event.type === 'COMMAND_FAILED').length;
  const commandFailures = allEvents.filter(event => event.type === 'COMMAND_FAILED').length;
  const checkpoints = allEvents.filter(event => event.type === 'CHECKPOINT_CREATED').length;
  const recoveries = allEvents.filter(event => event.type === 'SESSION_RESTORED' || event.type === 'TASK_CANCELLED').length;
  const durations = runs.map(runDurationSeconds);

  return {
    totalRuns,
    completedRuns,
    failedRuns,
    cancelledRuns,
    successRate: totalRuns === 0 ? 0 : Math.round((completedRuns / totalRuns) * 100),
    averageDurationSeconds: durations.length === 0 ? 0 : Math.round(durations.reduce((sum, item) => sum + item, 0) / durations.length),
    totalEvents: allEvents.length,
    filesChanged: uniqueFiles.size,
    commandsExecuted,
    commandFailures,
    checkpoints,
    recoveries,
  };
}

export async function analyticsCommand(): Promise<CommandResult> {
  const runs = ExecutionJournal.list(process.cwd());
  const eventsByRun = runs.map(run => ExecutionJournal.readEvents(process.cwd(), run.runId));
  const summary = computeAnalytics(runs, eventsByRun);

  renderAnalyticsDashboard(summary);
  return { success: true, message: 'Analytics displayed', data: summary as any };
}
