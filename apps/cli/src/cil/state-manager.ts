import type { ProjectState, SprintPhase, ProjectEvent, EventType, HealthScore } from '@codethon/shared-types';
import { loadProject, saveProject, createProject } from '../memory/project-store';
import { updateSprintPhase } from '../memory/session-store';

export class StateManager {
  getProject(): ProjectState | null {
    return loadProject();
  }

  getProjectOrThrow(): ProjectState {
    const project = loadProject();
    if (!project) {
      throw new Error('No active project. Run `ct init` first.');
    }
    return project;
  }

  initProject(idea: string, stack: string, timeline: string, experienceLevel: string, model?: string): ProjectState {
    const project = createProject(idea, stack, timeline, experienceLevel, model);
    this.emitEvent(project, 'project_created', `Project "${idea}" initialized with ${stack}`);
    return project;
  }

  updateProject(updates: Partial<ProjectState>): ProjectState {
    const project = this.getProjectOrThrow();
    const oldPhase = project.sprintPhase;
    Object.assign(project, updates);
    if (updates.sprintPhase && updates.sprintPhase !== oldPhase) {
      this.emitEvent(project, 'sprint_phase_changed', `Phase: ${oldPhase} → ${updates.sprintPhase}`, {
        from: oldPhase,
        to: updates.sprintPhase,
      });
    }
    saveProject(project);
    return project;
  }

  setSprintPhase(phase: SprintPhase): void {
    const project = this.getProjectOrThrow();
    const old = project.sprintPhase;
    if (old !== phase) {
      updateSprintPhase(phase);
      this.emitEvent(project, 'sprint_phase_changed', `Phase: ${old} → ${phase}`, { from: old, to: phase });
      project.sprintPhase = phase;
      saveProject(project);
    }
  }

  getSprintPhase(): SprintPhase | null {
    const project = this.getProject();
    return project?.sprintPhase || null;
  }

  saveRoadmap(roadmap: ProjectState['roadmap']): void {
    const project = this.getProjectOrThrow();
    project.roadmap = roadmap;
    project.sprintPhase = 'planning';
    this.emitEvent(project, 'roadmap_generated', `Roadmap with ${roadmap.milestones.length} milestones`);
    saveProject(project);
  }

  saveArchitecture(architecture: ProjectState['architecture']): void {
    const project = this.getProjectOrThrow();
    project.architecture = architecture;
    this.emitEvent(project, 'architecture_generated', `Architecture designed for ${(architecture.stack || []).join(', ')}`);
    saveProject(project);
  }

  addDebugSession(session: ProjectState['debugSessions'][0]): void {
    const project = this.getProjectOrThrow();
    session.resolved = false;
    project.debugSessions.push(session);
    this.emitEvent(project, 'debug_session', `Debug session: ${session.rootCause}`, { severity: session.severity });
    saveProject(project);
  }

  resolveDebugSession(index: number, resolution: string): void {
    const project = this.getProjectOrThrow();
    if (project.debugSessions[index]) {
      project.debugSessions[index].resolved = true;
      this.emitEvent(project, 'blocker_resolved', resolution);
      saveProject(project);
    }
  }

  updateDeploymentStatus(status: Partial<ProjectState['deploymentStatus']>): void {
    const project = this.getProjectOrThrow();
    Object.assign(project.deploymentStatus, status, { lastChecked: new Date().toISOString() });
    this.emitEvent(project, 'deployment_configured', `Deployment platform: ${status.platform || 'updated'}`);
    saveProject(project);
  }

  updateHealthScore(score: Partial<HealthScore>): void {
    const project = this.getProjectOrThrow();
    const oldScore = { ...project.healthScore };
    Object.assign(project.healthScore, score);
    project.healthHistory.push({
      timestamp: new Date().toISOString(),
      score: { ...project.healthScore },
    });
    if (project.healthScore.overall !== oldScore.overall) {
      this.emitEvent(project, 'health_recalculated', `Health: ${oldScore.overall} → ${project.healthScore.overall}`, {
        from: oldScore.overall,
        to: project.healthScore.overall,
      });
    }
    saveProject(project);
  }

  rollbackToSnapshot(snapshotIndex: number): ProjectState {
    const project = this.getProjectOrThrow();
    if (snapshotIndex < 0 || snapshotIndex >= project.healthHistory.length) {
      throw new Error('Invalid snapshot index');
    }
    const snapshot = project.healthHistory[snapshotIndex];
    project.healthScore = { ...snapshot.score };
    project.healthHistory = project.healthHistory.slice(0, snapshotIndex + 1);
    this.emitEvent(project, 'health_recalculated', `Rolled back to snapshot ${snapshotIndex}`);
    saveProject(project);
    return project;
  }

  addOutput(output: string): void {
    const project = this.getProjectOrThrow();
    project.outputs.push(output);
    saveProject(project);
  }

  private emitEvent(project: ProjectState, type: EventType, description: string, data?: Record<string, unknown>): void {
    if (!project.events) project.events = [];
    const event: ProjectEvent = {
      type,
      timestamp: new Date().toISOString(),
      description,
      data,
    };
    project.events.push(event);
  }
}
