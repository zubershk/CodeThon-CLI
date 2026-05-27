import type { ProjectState, SprintPhase } from '@codethon/shared-types';
import { StateManager } from './state-manager';
import { SprintManager } from './sprint-manager';
import { BlockerDetector } from './blocker-detector';
import { WorkflowOrchestrator } from './workflow-orchestrator';

export class ContextBuilder {
  private state: StateManager;
  private sprint: SprintManager;
  private blockers: BlockerDetector;
  private workflow: WorkflowOrchestrator;

  constructor() {
    this.state = new StateManager();
    this.sprint = new SprintManager();
    this.blockers = new BlockerDetector();
    this.workflow = new WorkflowOrchestrator();
  }

  buildContext(command: string, userInput?: string): string {
    const project = this.state.getProject();
    const parts: string[] = [];

    parts.push(`Command: ${command}`);
    parts.push('');

    if (!project) {
      parts.push('No active project. The user needs to run `ct init` first.');
      if (userInput) {
        parts.push('');
        parts.push('## User Input');
        parts.push(userInput);
      }
      return parts.join('\n');
    }

    // ── Project Identity ──
    parts.push('## Project Identity');
    parts.push(`Idea: ${project.idea}`);
    parts.push(`Stack: ${project.stack}`);
    parts.push(`Timeline: ${project.timeline}`);
    parts.push(`Experience Level: ${project.experienceLevel}`);
    parts.push(`Sprint Phase: ${project.sprintPhase}`);
    parts.push('');

    // ── Time Pressure ──
    const sprintInfo = this.sprint.getSprintInfo();
    if (sprintInfo) {
      parts.push('## Sprint Status');
      parts.push(`Elapsed: ${sprintInfo.elapsedHours}h / ${sprintInfo.totalHours}h`);
      parts.push(`Remaining: ${sprintInfo.remainingHours}h`);
      parts.push(`Pressure: ${sprintInfo.pressure.toUpperCase()}`);
      parts.push('');

      // Adaptive instruction based on pressure + skill
      const pressureLevel = sprintInfo.pressure;
      const skill = project.experienceLevel;
      if (pressureLevel === 'critical') {
        parts.push('⚠ CRITICAL: Very little time remaining. Prioritize only what is essential for the demo.');
      } else if (pressureLevel === 'high' && skill === 'beginner') {
        parts.push('⚠ Limited time. Suggest the simplest possible solution.');
      }
      parts.push('');
    }

    // ── Roadmap ──
    if (project.roadmap) {
      parts.push('## Current Roadmap');
      const done = project.roadmap.milestones.filter((m) => m.status === 'done').length;
      const total = project.roadmap.milestones.length;
      parts.push(`Progress: ${done}/${total} milestones complete`);
      project.roadmap.milestones.forEach((m) => {
        parts.push(`  ${m.status === 'done' ? '✓' : m.status === 'in_progress' ? '→' : '○'} ${m.title} (${m.priority})`);
      });
      parts.push('');
    }

    // ── Architecture ──
    if (project.architecture) {
      parts.push('## Architecture');
      parts.push(`Stack: ${(project.architecture.stack || []).join(', ')}`);
      if (project.architecture.apiRoutes) {
        parts.push(`API Routes: ${project.architecture.apiRoutes}`);
      }
      parts.push('');
    }

    // ── Active Blockers ──
    const activeBlockers = this.blockers.getActiveBlockers();
    if (activeBlockers.length > 0) {
      parts.push('## Active Blockers');
      activeBlockers.forEach((b) => {
        parts.push(`  [${b.severity.toUpperCase()}] [${b.category}] ${b.description}`);
      });
      parts.push('');
    }

    // ── Debug Sessions ──
    if (project.debugSessions.length > 0) {
      parts.push('## Debug History');
      const unresolved = project.debugSessions.filter((s) => !s.resolved);
      const resolved = project.debugSessions.filter((s) => s.resolved);
      parts.push(`Total: ${project.debugSessions.length} (${resolved.length} resolved, ${unresolved.length} open)`);
      const lastSession = project.debugSessions[project.debugSessions.length - 1];
      if (lastSession) {
        parts.push(`Last Error: ${lastSession.rootCause}`);
      }
      parts.push('');
    }

    // ── Deployment Status ──
    if (project.deploymentStatus.platform) {
      parts.push('## Deployment');
      parts.push(`Platform: ${project.deploymentStatus.platform}`);
      parts.push(`Live URL: ${project.deploymentStatus.url || 'Not yet deployed'}`);
      parts.push(`Build: ${project.deploymentStatus.buildPassing === true ? 'Passing' : project.deploymentStatus.buildPassing === false ? 'Failing' : 'Not checked'}`);
      parts.push('');
    }

    // ── Workflow Suggestions ──
    const suggestion = this.workflow.getNextSteps(command);
    if (suggestion.nextSuggestedCommands.length > 0) {
      parts.push('## Suggested Next Steps');
      suggestion.nextSuggestedCommands.forEach((cmd) => {
        parts.push(`  → ct ${cmd}`);
      });
      parts.push(`Rationale: ${suggestion.rationale}`);
      parts.push('');
    }

    // ── Launch Readiness ──
    if (project.launchReadiness) {
      const ready = project.launchReadiness.checklist.filter((i) => i.done).length;
      const total = project.launchReadiness.checklist.length;
      parts.push(`Launch Readiness: ${ready}/${total} checklist items complete (${project.launchReadiness.overall}%)`);
      parts.push('');
    }

    // ── Health Score ──
    if (project.healthScore.overall > 0) {
      parts.push(`Project Health: ${project.healthScore.overall}/100`);
      parts.push('');
    }

    // ── Memory Graph Insights ──
    if (project.memoryGraph && project.memoryGraph.length > 0) {
      const blockerPatterns = project.memoryGraph.filter((n) => n.type === 'blocker').length;
      const fixPatterns = project.memoryGraph.filter((n) => n.type === 'fix').length;
      parts.push(`Memory: ${project.memoryGraph.length} nodes tracked (${blockerPatterns} blockers, ${fixPatterns} fixes)`);
      parts.push('');
    }

    // ── User Input ──
    if (userInput) {
      parts.push('## User Input');
      parts.push(userInput);
      parts.push('');
    }

    // ── User Skill Adaptation ──
    const skillLevel = project.experienceLevel;
    if (skillLevel === 'beginner') {
      parts.push('## Important: This user is a BEGINNER. Provide step-by-step instructions with explanations. Avoid jargon. Include exact commands to run.');
    } else if (skillLevel === 'intermediate') {
      parts.push('## Note: This user has INTERMEDIATE experience. Provide clear instructions but you can use standard terminology.');
    }

    return parts.join('\n');
  }
}
