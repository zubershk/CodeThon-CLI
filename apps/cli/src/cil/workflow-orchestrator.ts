import type { SprintPhase, WorkflowStep, WorkflowSuggestion } from '@codethon/shared-types';
import { StateManager } from './state-manager';

const PHASE_TRANSITIONS: Record<SprintPhase, SprintPhase[]> = {
  ideation: ['planning'],
  planning: ['building'],
  building: ['debugging', 'deploying'],
  debugging: ['building', 'deploying'],
  deploying: ['launching'],
  launching: ['done'],
  done: [],
};

const PHASE_STEPS: Record<SprintPhase, WorkflowStep[]> = {
  ideation: [
    { command: 'init', label: 'Initialize', description: 'Define your project idea and stack', agent: 'system', status: 'current' },
    { command: 'roadmap', label: 'Create Roadmap', description: 'Generate milestones and tasks', agent: 'pm', status: 'pending' },
  ],
  planning: [
    { command: 'roadmap', label: 'Roadmap', description: 'Your project roadmap', agent: 'pm', status: 'done' },
    { command: 'architect', label: 'Design Architecture', description: 'Plan your tech stack and structure', agent: 'architect', status: 'current' },
    { command: 'scaffold', label: 'Scaffold Project', description: 'Generate starter code', agent: 'builder', status: 'pending' },
  ],
  building: [
    { command: 'architect', label: 'Architecture', description: 'Your architecture is ready', agent: 'architect', status: 'done' },
    { command: 'scaffold', label: 'Scaffolding', description: 'Project structure created', agent: 'builder', status: 'done' },
    { command: 'debug', label: 'Debug', description: 'Fix issues as they arise', agent: 'debug', status: 'current' },
  ],
  debugging: [
    { command: 'debug', label: 'Debug', description: 'Fix errors', agent: 'debug', status: 'done' },
    { command: 'deploy', label: 'Deploy', description: 'Get your app live', agent: 'devops', status: 'current' },
  ],
  deploying: [
    { command: 'deploy', label: 'Deploy', description: 'Application deployed', agent: 'devops', status: 'done' },
    { command: 'readme', label: 'Write README', description: 'Document your project', agent: 'launch', status: 'current' },
    { command: 'launch', label: 'Launch Assets', description: 'Generate submission content', agent: 'launch', status: 'pending' },
  ],
  launching: [
    { command: 'readme', label: 'README', description: 'Documentation ready', agent: 'launch', status: 'done' },
    { command: 'launch', label: 'Launch', description: 'Generate launch assets', agent: 'launch', status: 'done' },
    { command: 'startup', label: 'Startup Mode', description: 'Evaluate business potential', agent: 'startup', status: 'pending' },
  ],
  done: [],
};

export class WorkflowOrchestrator {
  private state: StateManager;

  constructor() {
    this.state = new StateManager();
  }

  getNextSteps(command: string): WorkflowSuggestion {
    const project = this.state.getProject();
    if (!project) {
      return {
        currentCommand: command,
        nextSuggestedCommands: ['init'],
        rationale: 'No project active. Start by initializing one.',
      };
    }

    const phase = project.sprintPhase;
    const steps = PHASE_STEPS[phase] || [];
    const doneSteps = steps.filter((s) => s.status === 'done').length;
    const totalSteps = steps.length;
    const currentIndex = steps.findIndex((s) => s.status === 'current');

    const next: string[] = [];

    if (currentIndex < totalSteps - 1) {
      for (let i = currentIndex + 1; i < totalSteps; i++) {
        if (steps[i].status === 'pending') {
          next.push(steps[i].command);
          if (next.length >= 3) break;
        }
      }
    }

    const nextPhases = PHASE_TRANSITIONS[phase] || [];
    if (nextPhases.length > 0 && next.length < 3) {
      const nextPhase = nextPhases[0];
      const nextSteps = PHASE_STEPS[nextPhase] || [];
      for (const step of nextSteps) {
        if (step.status !== 'done') {
          next.push(step.command);
          if (next.length >= 3) break;
        }
      }
    }

    if (next.length === 0) {
      if (phase === 'launching') {
        next.push('startup');
      } else if (phase === 'done') {
        next.push('init');
      } else {
        next.push('roadmap', 'architect', 'scaffold');
      }
    }

    return {
      currentCommand: command,
      nextSuggestedCommands: next,
      rationale: this.buildRationale(phase, next),
    };
  }

  getWorkflow(): WorkflowStep[] {
    const project = this.state.getProject();
    if (!project) return PHASE_STEPS.ideation;
    return PHASE_STEPS[project.sprintPhase] || PHASE_STEPS.ideation;
  }

  markStepDone(command: string): void {
    const project = this.state.getProject();
    if (!project) return;

    const phase = project.sprintPhase;
    const steps = PHASE_STEPS[phase] || [];
    const step = steps.find((s) => s.command === command);
    if (step) {
      step.status = 'done';
      // Advance to next step
      const currentIndex = steps.indexOf(step);
      if (currentIndex < steps.length - 1) {
        steps[currentIndex + 1].status = 'current';
      }
    }
  }

  private buildRationale(phase: SprintPhase, next: string[]): string {
    if (next.length === 0) return 'All tasks complete for this phase.';

    const reasons: Record<string, string> = {
      init: 'Start by defining your project',
      roadmap: 'Plan your milestones before building',
      architect: 'Design the architecture before coding',
      scaffold: 'Generate your starter project',
      debug: 'Fix the current errors to unblock progress',
      deploy: 'Get your application live',
      readme: 'Document your project for the submission',
      launch: 'Prepare launch assets for demo day',
      startup: 'Evaluate startup potential',
      learn: 'Learn more about the tools you are using',
    };

    return next
      .map((cmd) => reasons[cmd] || `Run ${cmd} to continue`)
      .join('. ');
  }
}
