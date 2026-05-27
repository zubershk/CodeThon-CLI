import { BaseAgent } from './base-agent';
import { DEVOPS_AGENT_PROMPT } from '../prompts';
import type { AgentOutput } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';

export class DevOpsAgent extends BaseAgent {
  private state: StateManager;

  constructor() {
    super(DEVOPS_AGENT_PROMPT);
    this.state = new StateManager();
  }

  async run(platform?: string): Promise<AgentOutput> {
    const output = await super.run('deploy', platform || 'auto');
    const project = this.state.getProjectOrThrow();
    project.deploymentStatus = {
      ...project.deploymentStatus,
      platform: platform || project.deploymentStatus.platform,
      lastChecked: new Date().toISOString(),
    };
    this.state.updateDeploymentStatus(project.deploymentStatus);
    return output;
  }
}
