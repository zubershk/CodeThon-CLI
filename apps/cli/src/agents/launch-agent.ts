import { BaseAgent } from './base-agent';
import { LAUNCH_AGENT_PROMPT } from '../prompts';

export class LaunchAgent extends BaseAgent {
  constructor() {
    super(LAUNCH_AGENT_PROMPT);
  }

  async run(mode: 'readme' | 'launch' | 'startup', userInput?: string): Promise<import('@codethon/shared-types').AgentOutput> {
    return super.run(mode, userInput);
  }
}
