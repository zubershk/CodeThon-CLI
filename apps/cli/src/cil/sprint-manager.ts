import type { SprintPhase, SprintInfo } from '@codethon/shared-types';
import { StateManager } from './state-manager';

const TIMELINE_HOURS: Record<string, number> = {
  '24h': 24,
  '48h': 48,
  '72h': 72,
  '1w': 168,
};

const PHASE_WEIGHTS: Record<SprintPhase, number> = {
  ideation: 0.05,
  planning: 0.1,
  building: 0.4,
  debugging: 0.2,
  deploying: 0.1,
  launching: 0.1,
  done: 0.05,
};

export class SprintManager {
  private state: StateManager;

  constructor() {
    this.state = new StateManager();
  }

  getSprintInfo(): SprintInfo | null {
    const project = this.state.getProject();
    if (!project) return null;

    const totalHours = TIMELINE_HOURS[project.timeline] || 48;
    const createdAt = new Date(project.createdAt).getTime();
    const now = Date.now();
    const elapsedHours = (now - createdAt) / (1000 * 60 * 60);
    const remainingHours = Math.max(0, totalHours - elapsedHours);
    const percent = Math.min(100, Math.round((elapsedHours / totalHours) * 100));

    let pressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
    const ratio = elapsedHours / totalHours;
    if (ratio > 0.9) pressure = 'critical';
    else if (ratio > 0.75) pressure = 'high';
    else if (ratio > 0.5) pressure = 'medium';

    return {
      phase: project.sprintPhase,
      totalHours,
      elapsedHours: Math.round(elapsedHours * 10) / 10,
      remainingHours: Math.round(remainingHours * 10) / 10,
      percentComplete: percent,
      pressure,
    };
  }

  autoTransition(newPhase?: SprintPhase): SprintPhase {
    const project = this.state.getProject();
    if (!project) return 'ideation';

    if (newPhase) {
      this.state.setSprintPhase(newPhase);
      return newPhase;
    }

    const currentPhase = project.sprintPhase;
    const transitionMap: Record<SprintPhase, SprintPhase> = {
      ideation: 'planning',
      planning: 'building',
      building: 'debugging',
      debugging: 'deploying',
      deploying: 'launching',
      launching: 'done',
      done: 'done',
    };

    const nextPhase = transitionMap[currentPhase] || currentPhase;
    if (nextPhase !== currentPhase) {
      this.state.setSprintPhase(nextPhase);
    }

    return nextPhase;
  }

  getTimePressure(): number {
    const info = this.getSprintInfo();
    if (!info) return 0;
    const ratio = info.elapsedHours / info.totalHours;
    return Math.min(100, Math.round(ratio * 100));
  }

  suggestPhase(): SprintPhase | null {
    const project = this.state.getProject();
    if (!project) return null;

    const hasRoadmap = !!project.roadmap;
    const hasArchitecture = !!project.architecture;
    const hasDebugSessions = project.debugSessions.length > 0;
    const hasDeployment = !!project.deploymentStatus.platform;
    const hasLaunch = project.outputs.some((o) => o.includes('launch') || o.includes('README'));

    if (!hasRoadmap) return 'ideation';
    if (!hasArchitecture) return 'planning';
    if (!hasDebugSessions) return 'building';
    if (!hasDeployment) return 'debugging';
    if (!hasLaunch) return 'deploying';
    return 'launching';
  }

  getRemainingTime(): { hours: number; display: string } {
    const info = this.getSprintInfo();
    if (!info) return { hours: 0, display: 'No timeline set' };

    const h = info.remainingHours;
    if (h <= 0) return { hours: 0, display: 'Deadline passed!' };
    if (h < 1) return { hours: h, display: `${Math.round(h * 60)} minutes` };
    if (h < 24) return { hours: h, display: `${Math.round(h)} hours` };
    return { hours: h, display: `${Math.round(h / 24)} days ${Math.round(h % 24)}h` };
  }
}
