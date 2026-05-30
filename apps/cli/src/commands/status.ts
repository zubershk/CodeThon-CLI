import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { getLLMConfig, getCurrentProjectId } from '../utils/config';
import { logger } from '../utils';
import { buildSuggestedActions, printActionHints, printHero, printSessionSnapshot } from '../utils/experience';
import { getProviderDisplayName } from '../utils/provider-catalog';

export async function statusCommand(): Promise<CommandResult> {
  const state = new StateManager();
  const project = state.getProject();
  const llm = getLLMConfig();
  const projectId = getCurrentProjectId();
  const providerReady = Boolean(llm.apiKey) || llm.provider === 'ollama' || llm.provider === 'local-server';

  printHero(
    'CodeThon Status',
    providerReady ? 'The CLI is ready to plan, execute, and review work.' : 'AI setup is incomplete. Finish setup before using agent-powered commands.',
    providerReady ? 'ready' : 'setup',
    providerReady ? 'Ready' : 'Setup needed',
  );

  printSessionSnapshot(llm, project);
  logger.labelValue('Project ID', projectId || 'N/A', chalk.cyanBright);
  logger.labelValue('Provider', getProviderDisplayName(llm.provider), chalk.cyanBright);
  logger.labelValue('Model', llm.model || 'Not set', chalk.cyanBright);
  logger.labelValue('Credentials', providerReady ? chalk.greenBright('Loaded') : chalk.redBright('Missing'), chalk.cyanBright);

  if (project?.totalTokensUsed !== undefined) {
    logger.labelValue('Tokens Used', `${project.totalTokensUsed}`, chalk.cyanBright);
  }
  if (project?.healthScore) {
    logger.divider();
    logger.info(chalk.bold.yellowBright('Health Scores'));
    logger.labelValue('  Overall', `${project.healthScore.overall}/100`, chalk.cyanBright);
    logger.labelValue('  MVP', `${project.healthScore.mvpCompletion}/100`, chalk.cyanBright);
    logger.labelValue('  Deploy', `${project.healthScore.deploymentReadiness}/100`, chalk.cyanBright);
  }

  printActionHints('Suggested next actions', buildSuggestedActions(llm, project), '/');

  return { success: true, message: 'Status displayed' };
}
