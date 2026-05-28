import { BaseAgent } from './base-agent';
import { ARCHITECT_AGENT_PROMPT } from '../prompts';
import type { AgentOutput } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';

export class ArchitectAgent extends BaseAgent {
  private state: StateManager;

  constructor() {
    super(ARCHITECT_AGENT_PROMPT);
    this.state = new StateManager();
  }

  async run(userInput?: string): Promise<AgentOutput> {
    const output = await super.run('architect', userInput);
    const project = this.state.getProjectOrThrow();
    // Parse architecture data from output
    project.architecture = {
      stack: [],
      backendStructure: output.details,
      generatedAt: new Date().toISOString(),
    };
    this.state.saveArchitecture(project.architecture);
    return output;
  }
}
