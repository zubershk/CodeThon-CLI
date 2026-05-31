import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { getLLMConfig, getCurrentProjectId } from '../utils/config';
import { getProviderDisplayName } from '../utils/provider-catalog';
import { ExecutionJournal } from '../journal/execution-journal';
import { renderHomeScreen } from '../ui/supernova';

export async function statusCommand(): Promise<CommandResult> {
  const state = new StateManager();
  const project = state.getProject();
  const llm = getLLMConfig();
  const projectId = getCurrentProjectId();
  const providerReady = Boolean(llm.apiKey) || llm.provider === 'ollama' || llm.provider === 'local-server';
  const runs = ExecutionJournal.list(process.cwd()).slice(0, 8).map(run => ({
    run,
    events: ExecutionJournal.readEvents(process.cwd(), run.runId),
  }));

  renderHomeScreen({
    project,
    projectId,
    provider: getProviderDisplayName(llm.provider),
    model: llm.model || 'Not set',
    credentialsReady: providerReady,
    runs,
  });

  return { success: true, message: 'Status displayed' };
}
