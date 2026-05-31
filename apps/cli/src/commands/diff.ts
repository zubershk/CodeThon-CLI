import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { getRuntime } from '../runtime';
import { logger } from '../utils';
import { renderDiffViewer } from '../ui/supernova';
import type { DiffFileSummary } from '../ui/supernova';

function parseNumstat(output: string): DiffFileSummary[] {
  return output.split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [addedRaw, removedRaw, ...pathParts] = line.split(/\s+/);
      return {
        path: pathParts.join(' '),
        status: 'M',
        added: Number(addedRaw) || 0,
        removed: Number(removedRaw) || 0,
      };
    });
}

function applyNameStatus(files: DiffFileSummary[], output: string): DiffFileSummary[] {
  const status = new Map<string, string>();
  for (const line of output.split(/\r?\n/)) {
    const [code, ...parts] = line.trim().split(/\s+/);
    const file = parts.join(' ');
    if (code && file) status.set(file, code);
  }
  return files.map(file => ({ ...file, status: status.get(file.path) || file.status }));
}

export async function diffCommand(): Promise<CommandResult> {
  const runtime = getRuntime();
  const diff = runtime.execute('git diff', 15000);
  const numstat = runtime.execute('git diff --numstat', 15000);
  const nameStatus = runtime.execute('git diff --name-status', 15000);

  if (!diff.success && diff.stderr) {
    logger.warn(diff.stderr);
    return { success: false, message: diff.stderr };
  }

  const files = applyNameStatus(parseNumstat(numstat.stdout || ''), nameStatus.stdout || '');
  renderDiffViewer(files, diff.stdout || '');

  return { success: true, message: 'Diff displayed', data: { files } as any };
}
