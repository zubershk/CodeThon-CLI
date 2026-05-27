import { BaseAgent } from './base-agent';
import { STARTUP_AGENT_PROMPT } from '../prompts';

export class StartupAgent extends BaseAgent {
  constructor() {
    super(STARTUP_AGENT_PROMPT);
  }

  async run(userInput?: string): Promise<import('@codethon/shared-types').AgentOutput> {
    return super.run('startup', userInput);
  }
}
