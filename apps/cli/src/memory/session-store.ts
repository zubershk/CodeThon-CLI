import type { SprintPhase } from '@codethon/shared-types';
import { loadProject, saveProject } from './project-store';

export function updateSprintPhase(phase: SprintPhase): void {
  const project = loadProject();
  if (!project) return;
  project.sprintPhase = phase;
  saveProject(project);
}

export function getSprintPhase(): SprintPhase | null {
  const project = loadProject();
  return project?.sprintPhase || null;
}

export function addBlocker(description: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
  const project = loadProject();
  if (!project) return;
  project.blockers.push({
    description,
    severity,
    category: 'unknown',
    timestamp: new Date().toISOString(),
    resolved: false,
  });
  saveProject(project);
}

export function resolveBlocker(index: number): void {
  const project = loadProject();
  if (!project) return;
  if (project.blockers[index]) {
    project.blockers[index].resolved = true;
    saveProject(project);
  }
}

export function addOutput(output: string): void {
  const project = loadProject();
  if (!project) return;
  project.outputs.push(output);
  saveProject(project);
}
