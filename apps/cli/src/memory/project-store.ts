import path from 'path';
import type { ProjectState } from '@codethon/shared-types';
import { getProjectsDir, getCurrentProjectId, setCurrentProjectId } from '../utils/config';
import { ensureDir, readJSON, writeJSON, listDirs } from '../utils/file-utils';
import { v4 as uuid } from 'uuid';

export function getProjectDir(projectId: string): string {
  return path.join(getProjectsDir(), projectId);
}

export function createProject(idea: string, stack: string, timeline: string, experienceLevel: string, model?: string): ProjectState {
  const id = uuid();
  const now = new Date().toISOString();
  const project: ProjectState = {
    id,
    name: idea.slice(0, 40).replace(/[^a-zA-Z0-9 ]/g, ''),
    idea,
    stack,
    timeline,
    model,
    experienceLevel: experienceLevel as any,
    sprintPhase: 'ideation',
    roadmap: null,
    architecture: null,
    debugSessions: [],
    blockers: [],
    outputs: [],
    events: [],
    feedback: [],
    memoryGraph: [],
    executionLog: [],
    deploymentStatus: {
      platform: null,
      url: null,
      envVarsSet: false,
      buildPassing: null,
      lastChecked: null,
    },
    healthScore: {
      overall: 0,
      mvpCompletion: 0,
      deploymentReadiness: 0,
      documentationCompleteness: 0,
      blockerSeverity: 0,
      launchReadiness: 0,
      velocity: 0,
      timePressure: 0,
    },
    healthHistory: [],
    launchReadiness: {
      overall: 0,
      checklist: [],
    },
    timePressure: 0,
    createdAt: now,
    updatedAt: now,
  };

  saveProject(project);
  setCurrentProjectId(id);
  return project;
}

export function saveProject(project: ProjectState): void {
  const dir = getProjectDir(project.id);
  ensureDir(dir);
  project.updatedAt = new Date().toISOString();
  writeJSON(path.join(dir, 'project.json'), project);
}

export function loadProject(projectId?: string): ProjectState | null {
  const id = projectId || getCurrentProjectId();
  if (!id) return null;
  return readJSON<ProjectState>(path.join(getProjectDir(id), 'project.json'));
}

export function listProjects(): { id: string; name: string; updatedAt: string }[] {
  const dir = getProjectsDir();
  ensureDir(dir);
  const ids = listDirs(dir);
  return ids
    .map((id) => {
      const project = loadProject(id);
      if (!project) return null;
      return {
        id: project.id,
        name: project.name || project.idea,
        updatedAt: project.updatedAt,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function deleteProject(projectId: string): void {
  const dir = getProjectDir(projectId);
  const fs = require('fs');
  fs.rmSync(dir, { recursive: true, force: true });
}
