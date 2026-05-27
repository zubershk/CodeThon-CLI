import { describe, it, expect, afterAll } from 'vitest';
import { StateManager } from '../src/cil/state-manager';
import { getProjectsDir, setCurrentProjectId } from '../src/utils/config';
import { HealthScoreCalculator } from '../src/cil/health-score';
import fs from 'fs';

function cleanupAll() {
  const dir = getProjectsDir();
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
  setCurrentProjectId(null);
}

describe('StateManager', () => {
  afterAll(() => {
    cleanupAll();
  });

  it('should create and retrieve a project', () => {
    const manager = new StateManager();
    const project = manager.initProject('Test Project', 'Next.js', '48h', 'beginner');
    expect(project.idea).toBe('Test Project');
    expect(project.sprintPhase).toBe('ideation');

    const loaded = manager.getProject();
    expect(loaded?.idea).toBe('Test Project');
  });

  it('should update sprint phase', () => {
    const manager = new StateManager();
    manager.initProject('Phase Test', 'Next.js', '48h', 'beginner');
    manager.setSprintPhase('planning');
    expect(manager.getSprintPhase()).toBe('planning');
  });

  it('should save and retrieve roadmap', () => {
    const manager = new StateManager();
    manager.initProject('Roadmap Test', 'Next.js', '48h', 'beginner');
    manager.saveRoadmap({
      milestones: [{ title: 'Setup', tasks: ['Init'], priority: 'critical', status: 'pending' }],
      overview: 'Test',
    });
    const project = manager.getProject();
    expect(project?.roadmap?.milestones[0].title).toBe('Setup');
  });

  it('should compute health score', () => {
    const manager = new StateManager();
    manager.initProject('Health Test', 'Next.js', '48h', 'beginner');
    const calculator = new HealthScoreCalculator();
    const score = calculator.calculate();
    expect(score.overall).toBeGreaterThanOrEqual(0);
  });

  it('should throw on missing project', () => {
    setCurrentProjectId(null);
    const manager = new StateManager();
    expect(() => manager.getProjectOrThrow()).toThrow('No active project');
  });
});
