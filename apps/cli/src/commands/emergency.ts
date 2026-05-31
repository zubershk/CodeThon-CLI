import type { CommandResult } from '@codethon/shared-types';
import { BaseAgent } from '../agents/base-agent';
import { EMERGENCY_AGENT_PROMPT } from '../prompts';
import { StateManager } from '../cil/state-manager';
import { logger } from '../utils';
import { promptLongText } from '../utils/prompt';
import { createMarkdownStreamRenderer } from '../utils/render';

export async function emergencyCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Emergency Recovery');
  logger.highlight('Demo-day crisis mode activated');
  logger.info('');

  const state = new StateManager();
  const project = state.getProject();
  if (!project) {
    logger.error('No active project. Run `/init` inside ct, or `ct init` from your shell.');
    return { success: false, message: 'No active project' };
  }

  const situation = await promptLongText({
    message: 'Describe the emergency (what crashed, what error you see):',
    validate: (input: string) => input.trim().length > 0 ? true : 'Please describe the emergency',
  });

  const agent = new BaseAgent(EMERGENCY_AGENT_PROMPT);
  const stream = createMarkdownStreamRenderer({ title: 'Emergency Assessment' });

  try {
    const assessment = await agent.runStream('emergency', token => stream.write(token), situation);
    stream.end();
    logger.info('');

    project.blockers.push({
      description: `Emergency: ${assessment.slice(0, 100)}`,
      severity: 'critical',
      category: 'unknown',
      timestamp: new Date().toISOString(),
      resolved: false,
    });
    state.updateProject({ blockers: project.blockers, sprintPhase: 'debugging' });

    return { success: true, message: 'Emergency assessment complete', data: { assessment } };
  } catch (error) {
    stream.end();
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to assess emergency' };
  }
}
