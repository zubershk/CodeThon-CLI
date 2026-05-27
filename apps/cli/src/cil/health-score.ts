import type { HealthScore, ProjectState, HealthSnapshot } from '@codethon/shared-types';
import { StateManager } from './state-manager';
import { SprintManager } from './sprint-manager';

export class HealthScoreCalculator {
  private state: StateManager;
  private sprint: SprintManager;

  constructor() {
    this.state = new StateManager();
    this.sprint = new SprintManager();
  }

  calculate(): HealthScore {
    const project = this.state.getProject();
    if (!project) {
      return {
        overall: 0,
        mvpCompletion: 0,
        deploymentReadiness: 0,
        documentationCompleteness: 0,
        blockerSeverity: 0,
        launchReadiness: 0,
        velocity: 0,
        timePressure: 0,
      };
    }

    const mvpCompletion = this.calculateMvpCompletion(project);
    const deploymentReadiness = this.calculateDeploymentReadiness(project);
    const documentationCompleteness = this.calculateDocumentation(project);
    const blockerSeverity = this.calculateBlockerScore(project);
    const launchReadiness = this.calculateLaunchReadiness(project);
    const velocity = this.calculateVelocity(project);
    const timePressure = this.sprint.getTimePressure();

    const dimensions = [mvpCompletion, deploymentReadiness, documentationCompleteness, blockerSeverity, launchReadiness, velocity];
    const weighted = dimensions[0] * 0.25 + dimensions[1] * 0.15 + dimensions[2] * 0.1 + dimensions[3] * 0.2 + dimensions[4] * 0.15 + dimensions[5] * 0.15;
    const overall = Math.round(weighted);

    const score: HealthScore = {
      overall,
      mvpCompletion,
      deploymentReadiness,
      documentationCompleteness,
      blockerSeverity,
      launchReadiness,
      velocity,
      timePressure,
    };

    this.state.updateHealthScore(score);
    return score;
  }

  getTrend(): { direction: 'up' | 'down' | 'stable'; change: number } {
    const project = this.state.getProject();
    if (!project || project.healthHistory.length < 2) {
      return { direction: 'stable', change: 0 };
    }

    const history = project.healthHistory;
    const last = history[history.length - 1].score.overall;
    const prev = history[history.length - 2].score.overall;
    const change = last - prev;

    return {
      direction: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      change,
    };
  }

  private calculateMvpCompletion(project: ProjectState): number {
    let score = 0;
    if (project.roadmap) {
      const done = project.roadmap.milestones.filter((m) => m.status === 'done').length;
      const inProgress = project.roadmap.milestones.filter((m) => m.status === 'in_progress').length;
      const total = project.roadmap.milestones.length;
      score += total > 0 ? ((done * 1 + inProgress * 0.5) / total) * 40 : 0;
    }
    if (project.architecture) score += 15;
    if (project.sprintPhase !== 'ideation' && project.sprintPhase !== 'planning') score += 15;
    if (project.debugSessions.length > 0) score += 15;
    if (project.deploymentStatus.platform) score += 15;
    return Math.min(100, score);
  }

  private calculateDeploymentReadiness(project: ProjectState): number {
    let score = 0;
    if (project.deploymentStatus.platform) score += 25;
    if (project.deploymentStatus.envVarsSet) score += 25;
    if (project.deploymentStatus.buildPassing === true) score += 30;
    if (project.deploymentStatus.buildPassing === false) score += 5;
    if (project.deploymentStatus.url) score += 20;
    return Math.min(100, score);
  }

  private calculateDocumentation(project: ProjectState): number {
    let score = 0;
    if (project.roadmap) score += 20;
    if (project.architecture) score += 20;
    if (project.outputs.some((o) => o.toLowerCase().includes('readme'))) score += 25;
    if (project.outputs.some((o) => o.toLowerCase().includes('launch'))) score += 20;
    if (project.sprintPhase === 'launching' || project.sprintPhase === 'done') score += 15;
    return Math.min(100, score);
  }

  private calculateBlockerScore(project: ProjectState): number {
    const activeBlockers = project.blockers.filter((b) => !b.resolved);
    if (activeBlockers.length === 0) return 100;

    let penalty = 0;
    for (const blocker of activeBlockers) {
      switch (blocker.severity) {
        case 'critical': penalty += 30; break;
        case 'high': penalty += 20; break;
        case 'medium': penalty += 10; break;
        case 'low': penalty += 5; break;
      }
    }
    // Bonus for having resolved blockers (shows progress)
    const resolvedCount = project.blockers.filter((b) => b.resolved).length;
    const bonus = Math.min(20, resolvedCount * 5);

    return Math.max(0, Math.min(100, 100 - penalty + bonus));
  }

  private calculateLaunchReadiness(project: ProjectState): number {
    let score = 10;
    if (project.deploymentStatus.url) score += 25;
    if (project.roadmap && project.roadmap.milestones.some((m) => m.status === 'done')) score += 15;
    if (project.outputs.some((o) => o.includes('README'))) score += 15;
    if (project.outputs.some((o) => o.includes('Launch') || o.includes('launch'))) score += 20;
    if (project.sprintPhase === 'launching' || project.sprintPhase === 'done') score += 15;
    return Math.min(100, score);
  }

  private calculateVelocity(project: ProjectState): number {
    // How many events/tasks completed relative to time elapsed
    const eventCount = project.events?.length || 0;
    const debugCount = project.debugSessions.length;
    const outputCount = project.outputs.length;
    const totalActions = eventCount + debugCount + outputCount;

    const sprintInfo = this.sprint.getSprintInfo();
    if (!sprintInfo || sprintInfo.elapsedHours === 0) return 0;

    const actionsPerHour = totalActions / sprintInfo.elapsedHours;
    // Normalize: 2+ actions/hour = 100%, 0 = 0%
    return Math.min(100, Math.round(actionsPerHour * 50));
  }
}
