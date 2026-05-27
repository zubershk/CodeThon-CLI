import type { LaunchReadiness, LaunchChecklistItem, ProjectState } from '@codethon/shared-types';
import { StateManager } from './state-manager';

export class LaunchReadinessChecker {
  private state: StateManager;

  constructor() {
    this.state = new StateManager();
  }

  check(): LaunchReadiness {
    const project = this.state.getProject();
    if (!project) {
      return {
        overall: 0,
        checklist: this.buildChecklist(null),
      };
    }

    const checklist = this.buildChecklist(project);
    const done = checklist.filter((i) => i.done).length;
    const required = checklist.filter((i) => i.required).length;
    const requiredDone = checklist.filter((i) => i.required && i.done).length;
    const overall = required > 0 ? Math.round((requiredDone / required) * 100) : 0;

    const readiness: LaunchReadiness = { overall, checklist };
    project.launchReadiness = readiness;
    this.state.updateProject({ launchReadiness: readiness });

    return readiness;
  }

  private buildChecklist(project: ProjectState | null): LaunchChecklistItem[] {
    return [
      {
        key: 'idea_defined',
        label: 'Product idea clearly defined',
        done: !!project?.idea,
        required: true,
      },
      {
        key: 'roadmap_created',
        label: 'Roadmap with milestones generated',
        done: !!project?.roadmap,
        required: true,
      },
      {
        key: 'architecture_designed',
        label: 'Architecture designed',
        done: !!project?.architecture,
        required: true,
      },
      {
        key: 'project_scaffolded',
        label: 'Project scaffolded with starter code',
        done: project?.events?.some((e) => e.type === 'scaffold_created') || false,
        required: true,
      },
      {
        key: 'core_mvp_built',
        label: 'Core MVP features implemented',
        done: project?.sprintPhase === 'debugging' || project?.sprintPhase === 'deploying' || project?.sprintPhase === 'launching' || project?.sprintPhase === 'done',
        required: true,
      },
      {
        key: 'errors_resolved',
        label: 'No critical blockers remaining',
        done: !project?.blockers?.some((b) => !b.resolved && b.severity === 'critical'),
        required: true,
      },
      {
        key: 'errors_reviewed',
        label: 'Debug sessions reviewed and resolved',
        done: project?.debugSessions?.every((s) => s.resolved) || project?.debugSessions?.length === 0,
        required: true,
      },
      {
        key: 'deployment_configured',
        label: 'Deployment platform configured',
        done: !!project?.deploymentStatus?.platform,
        required: true,
      },
      {
        key: 'env_vars_set',
        label: 'Environment variables configured',
        done: project?.deploymentStatus?.envVarsSet || false,
        required: true,
      },
      {
        key: 'build_passing',
        label: 'Build passing successfully',
        done: project?.deploymentStatus?.buildPassing === true,
        required: false,
      },
      {
        key: 'deployment_live',
        label: 'Application deployed and live',
        done: !!project?.deploymentStatus?.url,
        required: false,
      },
      {
        key: 'readme_written',
        label: 'README generated',
        done: project?.outputs?.some((o) => o.includes('README')) || false,
        required: true,
      },
      {
        key: 'demo_prepared',
        label: 'Demo script prepared',
        done: project?.outputs?.some((o) => o.includes('launch') || o.includes('demo')) || false,
        required: false,
      },
      {
        key: 'launch_assets',
        label: 'Launch assets generated (posts, submission)',
        done: project?.outputs?.some((o) => o.includes('Launch assets')) || false,
        required: true,
      },
      {
        key: 'startup_evaluated',
        label: 'Startup potential evaluated',
        done: project?.outputs?.some((o) => o.includes('startup') || o.includes('Startup')) || false,
        required: false,
      },
    ];
  }
}
