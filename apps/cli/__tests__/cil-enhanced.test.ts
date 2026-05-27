import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { StateManager } from '../src/cil/state-manager';
import { WorkflowOrchestrator } from '../src/cil/workflow-orchestrator';
import { SprintManager } from '../src/cil/sprint-manager';
import { MemoryGraph } from '../src/cil/memory-graph';
import { FeedbackLoop } from '../src/cil/feedback-loop';
import { ExecutionTracker } from '../src/cil/execution-tracker';
import { LaunchReadinessChecker } from '../src/cil/launch-readiness';
import { HealthScoreCalculator } from '../src/cil/health-score';
import { BlockerDetector } from '../src/cil/blocker-detector';
import { ContextBuilder } from '../src/cil/context-builder';
import { getProjectsDir, setCurrentProjectId } from '../src/utils/config';
import fs from 'fs';

function cleanup() {
  const dir = getProjectsDir();
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
  setCurrentProjectId(null);
}

describe('WorkflowOrchestrator', () => {
  beforeEach(() => { cleanup(); });

  afterAll(() => { cleanup(); });

  it('should suggest init when no project exists', () => {
    const wf = new WorkflowOrchestrator();
    const suggestion = wf.getNextSteps('roadmap');
    expect(suggestion.nextSuggestedCommands).toContain('init');
  });

  it('should suggest roadmap after init', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const wf = new WorkflowOrchestrator();
    const suggestion = wf.getNextSteps('init');
    expect(suggestion.nextSuggestedCommands).toContain('roadmap');
  });

  it('should suggest scaffold after roadmap (phase=planning)', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    state.saveRoadmap({
      milestones: [{ title: 'M1', tasks: ['T1'], priority: 'high', status: 'pending' }],
      overview: 'Test',
      generatedAt: new Date().toISOString(),
    });
    const wf = new WorkflowOrchestrator();
    const suggestion = wf.getNextSteps('roadmap');
    expect(suggestion.nextSuggestedCommands.length).toBeGreaterThan(0);
  });
});

describe('SprintManager', () => {
  beforeEach(() => { cleanup(); });
  afterAll(() => { cleanup(); });

  it('should return null for no project', () => {
    const sprint = new SprintManager();
    expect(sprint.getSprintInfo()).toBeNull();
  });

  it('should track time for 48h timeline', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const sprint = new SprintManager();
    const info = sprint.getSprintInfo();
    expect(info).not.toBeNull();
    expect(info!.totalHours).toBe(48);
    expect(info!.remainingHours).toBeGreaterThan(0);
  });

  it('should detect time pressure', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '24h', 'beginner');
    const sprint = new SprintManager();
    const pressure = sprint.getTimePressure();
    expect(pressure).toBeGreaterThanOrEqual(0);
  });

  it('should auto-transition phases', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const sprint = new SprintManager();
    const next = sprint.autoTransition('planning');
    expect(next).toBe('planning');
  });
});

describe('MemoryGraph', () => {
  beforeEach(() => { cleanup(); });
  afterAll(() => { cleanup(); });

  it('should add and retrieve nodes', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const mem = new MemoryGraph();
    const node = mem.addNode('blocker', 'Database connection failed', ['database', 'connection']);
    expect(node.id).toBeTruthy();
    expect(node.type).toBe('blocker');
    expect(node.tags).toContain('database');
  });

  it('should find related nodes by tags', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const mem = new MemoryGraph();
    mem.addNode('blocker', 'Database timeout', ['database', 'timeout']);
    mem.addNode('fix', 'Increased pool size', ['database', 'fix']);
    const found = mem.findRelated('database', 'blocker');
    expect(found.length).toBeGreaterThan(0);
  });

  it('should connect nodes', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const mem = new MemoryGraph();
    const n1 = mem.addNode('blocker', 'Error X', ['error']);
    const n2 = mem.addNode('fix', 'Fixed X by Y', ['fix']);
    mem.connect(n1.id, n2.id, 'fixed');
    const found = mem.findRelated('Error');
    expect(found.length).toBeGreaterThan(0);
  });
});

describe('FeedbackLoop', () => {
  beforeEach(() => { cleanup(); });
  afterAll(() => { cleanup(); });

  it('should record and retrieve feedback', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const fb = new FeedbackLoop();
    fb.recordFeedback('roadmap', 5, 'Great roadmap!');
    fb.recordFeedback('debug', 3, 'Could be better');
    expect(fb.getTotalFeedbackCount()).toBe(2);
    expect(fb.getAverageRating('roadmap')).toBe(5);
  });

  it('should identify weak commands', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const fb = new FeedbackLoop();
    fb.recordFeedback('debug', 2, 'Not helpful');
    fb.recordFeedback('roadmap', 5, 'Great');
    const weak = fb.getWeakCommands();
    expect(weak.length).toBeGreaterThan(0);
    expect(weak[0].command).toBe('debug');
  });

  it('should identify strengths', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const fb = new FeedbackLoop();
    fb.recordFeedback('roadmap', 5);
    fb.recordFeedback('init', 4);
    const strengths = fb.getStrengths();
    expect(strengths.some((s) => s.command === 'roadmap')).toBe(true);
  });
});

describe('ExecutionTracker', () => {
  beforeEach(() => { cleanup(); });
  afterAll(() => { cleanup(); });

  it('should record execution', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const et = new ExecutionTracker();
    et.recordExecution('npm install', true, 5000, 'installed', 'architect');
    expect(et.getTotalExecutions()).toBe(1);
  });

  it('should calculate failure rate', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const et = new ExecutionTracker();
    et.recordExecution('npm install', true, 1000, 'ok');
    et.recordExecution('npm test', false, 500, 'fail');
    et.recordExecution('npm build', false, 500, 'fail');
    expect(et.getFailureRate()).toBe(67);
  });

  it('should identify common failures', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const et = new ExecutionTracker();
    et.recordExecution('npm test', false, 100, 'fail');
    et.recordExecution('npm test', false, 100, 'fail');
    et.recordExecution('npm build', true, 100, 'ok');
    const failures = et.getCommonFailures();
    expect(failures.length).toBeGreaterThan(0);
  });
});

describe('LaunchReadinessChecker', () => {
  beforeEach(() => { cleanup(); });
  afterAll(() => { cleanup(); });

  it('should return 0 for no project', () => {
    const checker = new LaunchReadinessChecker();
    const result = checker.check();
    expect(result.overall).toBe(0);
    expect(result.checklist.length).toBeGreaterThan(0);
  });

  it('should improve with project progress', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    state.saveRoadmap({
      milestones: [{ title: 'M1', tasks: ['T1'], priority: 'high', status: 'done' }],
      overview: 'Test',
      generatedAt: new Date().toISOString(),
    });

    const checker = new LaunchReadinessChecker();
    const result = checker.check();
    expect(result.overall).toBeGreaterThan(0);
  });
});

describe('Enhanced HealthScore', () => {
  beforeEach(() => { cleanup(); });
  afterAll(() => { cleanup(); });

  it('should include velocity and time pressure', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const health = new HealthScoreCalculator();
    const score = health.calculate();
    expect(score).toHaveProperty('velocity');
    expect(score).toHaveProperty('timePressure');
  });

  it('should track trends', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const health = new HealthScoreCalculator();
    health.calculate();
    state.saveRoadmap({
      milestones: [{ title: 'M1', tasks: ['T1'], priority: 'high', status: 'done' }],
      overview: 'Test',
      generatedAt: new Date().toISOString(),
    });
    health.calculate();
    const trend = health.getTrend();
    expect(['up', 'down', 'stable']).toContain(trend.direction);
  });
});

describe('Enhanced BlockerDetector', () => {
  beforeEach(() => { cleanup(); });
  afterAll(() => { cleanup(); });

  it('should support categories', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const blockers = new BlockerDetector();
    blockers.addBlocker('DB connection failed', 'critical', 'database');
    const dbBlockers = blockers.getBlockersByCategory('database');
    expect(dbBlockers.length).toBe(1);
    expect(dbBlockers[0].category).toBe('database');
  });

  it('should predict recurring blockers', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const blockers = new BlockerDetector();
    blockers.addBlocker('Deploy fail 1', 'high', 'deployment');
    blockers.addBlocker('Deploy fail 2', 'high', 'deployment');
    blockers.addBlocker('Deploy fail 3', 'high', 'deployment');
    const warnings = blockers.predictRecurringBlockers();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].toLowerCase()).toContain('deployment');
  });

  it('should show blocker trend', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const blockers = new BlockerDetector();
    const trend = blockers.getBlockTrend();
    expect(trend).toHaveProperty('up');
    expect(trend).toHaveProperty('percentage');
  });
});

describe('Enhanced StateManager - Event Sourcing', () => {
  beforeEach(() => { cleanup(); });
  afterAll(() => { cleanup(); });

  it('should emit project_created event on init', () => {
    const state = new StateManager();
    const project = state.initProject('Test', 'Next.js', '48h', 'beginner');
    expect(project.events.length).toBeGreaterThan(0);
    expect(project.events[0].type).toBe('project_created');
  });

  it('should emit events on state changes', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    state.saveRoadmap({
      milestones: [{ title: 'M1', tasks: ['T1'], priority: 'high', status: 'pending' }],
      overview: 'Test',
      generatedAt: new Date().toISOString(),
    });
    const project = state.getProject()!;
    expect(project.events.some((e) => e.type === 'roadmap_generated')).toBe(true);
  });

  it('should maintain health history', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const health = new HealthScoreCalculator();
    health.calculate();
    health.calculate();
    const project = state.getProject()!;
    expect(project.healthHistory.length).toBe(2);
  });
});

describe('Enhanced ContextBuilder', () => {
  beforeEach(() => { cleanup(); });
  afterAll(() => { cleanup(); });

  it('should adapt to beginner skill level', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'beginner');
    const ctx = new ContextBuilder();
    const context = ctx.buildContext('test');
    expect(context.toLowerCase()).toContain('beginner');
  });

  it('should include sprint pressure', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '24h', 'advanced');
    const ctx = new ContextBuilder();
    const context = ctx.buildContext('test');
    expect(context).toContain('Sprint Status');
  });

  it('should include blocker info when present', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'intermediate');
    const blockers = new BlockerDetector();
    blockers.addBlocker('Test error', 'high', 'code');
    const ctx = new ContextBuilder();
    const context = ctx.buildContext('test');
    expect(context).toContain('Test error');
  });

  it('should include workflow suggestions', () => {
    const state = new StateManager();
    state.initProject('Test', 'Next.js', '48h', 'intermediate');
    const ctx = new ContextBuilder();
    const context = ctx.buildContext('init');
    expect(context).toContain('Suggested Next Steps');
  });
});
