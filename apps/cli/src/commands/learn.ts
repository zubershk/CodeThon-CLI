import inquirer from 'inquirer';
import type { CommandResult } from '@codethon/shared-types';
import { MentorAgent } from '../agents/mentor-agent';
import { createSpinner, logger } from '../utils';

export async function learnCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Mentor Mode');

  const { question } = await inquirer.prompt([
    {
      type: 'input',
      name: 'question',
      message: 'What do you want to learn?',
      validate: (input: string) => input.trim().length > 0 ? true : 'Please enter a question',
    },
  ]);

  const agent = new MentorAgent();
  const spinner = createSpinner('Researching your question...');
  spinner.start();

  try {
    const output = await agent.run(question);

    spinner.succeed('Answer ready!');
    logger.info('');
    logger.outputBlock(output.details);
    logger.info('');
    logger.divider();
    logger.muted('Tip: Try "ct learn How do I connect to a database?" to practice');

    return { success: true, message: 'Question answered', data: { answer: output.details } };
  } catch (error) {
    spinner.fail('Failed to get answer');
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to get answer' };
  }
}
