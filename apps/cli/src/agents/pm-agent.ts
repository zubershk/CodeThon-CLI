import { BaseAgent } from './base-agent';
import { PM_AGENT_PROMPT } from '../prompts';
import type { AgentOutput } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';

export class PMAgent extends BaseAgent {
  private state: StateManager;

  constructor() {
    super(PM_AGENT_PROMPT);
    this.state = new StateManager();
  }

  async run(userInput?: string): Promise<AgentOutput> {
    const output = await super.run('roadmap', userInput);
    // Extract and save roadmap structure
    const project = this.state.getProjectOrThrow();
    project.roadmap = {
      milestones: [],
      overview: output.summary,
    };
    this.state.saveRoadmap(project.roadmap);
    return output;
  }
}
