import inquirer from 'inquirer';
import type { CommandResult } from '@codethon/shared-types';
import { BaseAgent } from '../agents/base-agent';
import { EMERGENCY_AGENT_PROMPT } from '../prompts';
import { StateManager } from '../cil/state-manager';
import { createSpinner, logger } from '../utils';

export async function emergencyCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Emergency Recovery');
  logger.highlight('Demo-day crisis mode activated');
  logger.info('');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  const { situation } = await inquirer.prompt([
    {
      type: 'editor',
      name: 'situation',
      message: 'Describe the emergency (what crashed, what error you see):',
      validate: (input: string) => input.trim().length > 0 ? true : 'Please describe the emergency',
    },
  ]);

  const agent = new BaseAgent(EMERGENCY_AGENT_PROMPT);
  const spinner = createSpinner('Assessing emergency...');
  spinner.start();

  try {
    const output = await agent.run('emergency', situation);

    spinner.succeed('Emergency assessment ready!');
    logger.info('');
    logger.outputBlock(output.details);
    logger.info('');

    project.blockers.push({
      description: `Emergency: ${output.summary}`,
      severity: 'critical',
      category: 'unknown',
      timestamp: new Date().toISOString(),
      resolved: false,
    });
    state.updateProject({ blockers: project.blockers, sprintPhase: 'debugging' });

    return { success: true, message: 'Emergency assessment complete', data: { assessment: output.details } };
  } catch (error) {
    spinner.fail('Failed to assess emergency');
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Failed to assess emergency' };
  }
}
