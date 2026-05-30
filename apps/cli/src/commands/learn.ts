import type { CommandResult } from '@codethon/shared-types';
import { MentorAgent } from '../agents/mentor-agent';
import { logger } from '../utils';
import { promptInput } from '../utils/prompt';
import { createMarkdownStreamRenderer } from '../utils/render';

export async function learnCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Mentor Mode');

  const question = await promptInput({
    message: 'What do you want to learn?',
    validate: (input: string) => input.trim().length > 0 ? true : 'Please enter a question',
  });

  const agent = new MentorAgent();
  const stream = createMarkdownStreamRenderer({ title: 'Mentor Answer' });

  try {
    const answer = await agent.runStream(question, token => stream.write(token));
    stream.end();
    logger.info('');
    logger.divider();
    logger.muted('Tip: Try "/learn How do I connect to a database?" to practice');

    return { success: true, message: 'Question answered', data: { answer } };
  } catch (error) {
    stream.end();
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false, message: 'Failed to get answer' };
  }
}
