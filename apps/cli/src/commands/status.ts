import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { getLLMConfig, getCurrentProjectId } from '../utils/config';
import { logger } from '../utils';

export async function statusCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Session Status');

  const state = new StateManager();
  const project = state.getProject();
  const llm = getLLMConfig();
  const projectId = getCurrentProjectId();

  logger.labelValue('Active Project', project?.name || 'None', chalk.cyanBright);
  logger.labelValue('Project ID', projectId || 'N/A', chalk.cyanBright);
  logger.labelValue('Phase', project?.sprintPhase || 'N/A', chalk.cyanBright);
  logger.labelValue('Provider', llm.provider, chalk.cyanBright);
  logger.labelValue('Model', llm.model || 'Not set', chalk.cyanBright);
  logger.labelValue('API Key Set', llm.apiKey ? chalk.greenBright('Yes') : chalk.redBright('No'), chalk.cyanBright);
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

  return { success: true, message: 'Status displayed' };
}
