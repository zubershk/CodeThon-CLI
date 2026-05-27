import { BaseAgent } from './base-agent';
import { MENTOR_AGENT_PROMPT } from '../prompts';

export class MentorAgent extends BaseAgent {
  constructor() {
    super(MENTOR_AGENT_PROMPT);
  }

  async run(question: string): Promise<import('@codethon/shared-types').AgentOutput> {
    return super.run('learn', question);
  }
}
