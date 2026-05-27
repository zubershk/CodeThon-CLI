import { describe, it, expect, afterAll } from 'vitest';
import { StateManager } from '../src/cil/state-manager';
import { HealthScoreCalculator } from '../src/cil/health-score';
import { getProjectsDir, setCurrentProjectId } from '../src/utils/config';
import fs from 'fs';

function cleanupAll() {
  const dir = getProjectsDir();
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
  setCurrentProjectId(null);
}

describe('HealthScoreCalculator', () => {
  afterAll(() => {
    cleanupAll();
  });

  it('should return 0 for empty project', () => {
    setCurrentProjectId(null);
    const calculator = new HealthScoreCalculator();
    const score = calculator.calculate();
    expect(score.overall).toBe(0);
  });

  it('should improve score with roadmap', () => {
    const manager = new StateManager();
    manager.initProject('Test', 'Next.js', '48h', 'intermediate');
    const calculator = new HealthScoreCalculator();
    const before = calculator.calculate();

    manager.saveRoadmap({
      milestones: [
        { title: 'M1', tasks: ['T1'], priority: 'high', status: 'done' },
        { title: 'M2', tasks: ['T2'], priority: 'high', status: 'pending' },
      ],
      overview: 'Test',
    });

    const after = calculator.calculate();
    expect(after.mvpCompletion).toBeGreaterThan(before.mvpCompletion);
  });

  it('should improve score with deployment', () => {
    const manager = new StateManager();
    manager.initProject('Test', 'Next.js', '48h', 'intermediate');
    manager.updateDeploymentStatus({
      platform: 'Vercel',
      url: 'https://test.vercel.app',
      envVarsSet: true,
      buildPassing: true,
    });

    const calculator = new HealthScoreCalculator();
    const score = calculator.calculate();
    expect(score.deploymentReadiness).toBeGreaterThan(0);
  });
});
