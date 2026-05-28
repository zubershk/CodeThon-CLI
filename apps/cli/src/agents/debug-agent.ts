import { BaseAgent } from './base-agent';
import { DEBUG_AGENT_PROMPT } from '../prompts';
import type { AgentOutput } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';

export class DebugAgent extends BaseAgent {
  private state: StateManager;

  constructor() {
    super(DEBUG_AGENT_PROMPT);
    this.state = new StateManager();
  }

  async run(errorInput: string): Promise<AgentOutput> {
    const output = await super.run('debug', errorInput);
    const project = this.state.getProjectOrThrow();

    project.debugSessions.push({
      timestamp: new Date().toISOString(),
      input: errorInput,
      rootCause: output.summary,
      fixes: [],
      recoverySteps: [],
      commands: [],
      severity: this.detectSeverity(errorInput),
      resolved: false,
    });

    project.blockers.push({
      description: output.summary || 'Debug session recorded',
      severity: 'high',
      category: 'unknown',
      timestamp: new Date().toISOString(),
      resolved: false,
    });

    this.state.updateProject({ debugSessions: project.debugSessions, blockers: project.blockers });
    return output;
  }

  private detectSeverity(input: string): 'low' | 'medium' | 'high' | 'critical' {
    const lower = input.toLowerCase();
    if (lower.includes('crash') || lower.includes('down') || lower.includes('500') || lower.includes('fatal')) {
      return 'critical';
    }
    if (lower.includes('error') || lower.includes('fail') || lower.includes('exception')) {
      return 'high';
    }
    if (lower.includes('warn') || lower.includes('deprecat')) {
      return 'medium';
    }
    return 'low';
  }
}
