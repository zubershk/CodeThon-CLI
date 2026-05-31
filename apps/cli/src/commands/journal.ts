import type { CommandResult } from '@codethon/shared-types';
import { ExecutionJournal } from '../journal/execution-journal';
import { logger } from '../utils';
import { renderReplayTimeline, renderRunInspect, renderSessionDashboard } from '../ui/supernova';

function latestRunId(): string | null {
  return ExecutionJournal.list(process.cwd())[0]?.runId || null;
}

export async function inspectCommand(runIdArg?: string): Promise<CommandResult> {
  const runs = ExecutionJournal.list(process.cwd());
  if (runs.length === 0) {
    logger.info('No execution journals found yet. Run /execute first.');
    return { success: true, message: 'No execution journals found' };
  }

  if (!runIdArg) {
    renderSessionDashboard(runs.map(run => ({
      run,
      events: ExecutionJournal.readEvents(process.cwd(), run.runId),
    })));
    return { success: true, message: 'Session dashboard displayed', data: { runs } as any };
  }

  const runId = runIdArg || runs[0].runId;
  const run = runs.find(item => item.runId === runId);
  if (!run) {
    logger.warn(`Run not found: ${runId}`);
    return { success: false, message: `Run not found: ${runId}` };
  }

  const events = ExecutionJournal.readEvents(process.cwd(), runId);
  renderRunInspect(run, events);

  return { success: true, message: `Inspected ${runId}`, data: { run, events } as any };
}

export async function replayCommand(runIdArg?: string): Promise<CommandResult> {
  const runId = runIdArg || latestRunId();
  if (!runId) {
    logger.info('No execution journals found yet. Run /execute first.');
    return { success: true, message: 'No execution journals found' };
  }

  const events = ExecutionJournal.readEvents(process.cwd(), runId);
  if (events.length === 0) {
    logger.warn(`No events found for run: ${runId}`);
    return { success: false, message: `No events found for run: ${runId}` };
  }

  renderReplayTimeline(runId, events);

  return { success: true, message: `Replayed ${runId}`, data: { events } as any };
}
