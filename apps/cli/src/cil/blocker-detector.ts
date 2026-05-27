import type { Blocker, BlockerCategory } from '@codethon/shared-types';
import { StateManager } from './state-manager';

export class BlockerDetector {
  private state: StateManager;

  constructor() {
    this.state = new StateManager();
  }

  getActiveBlockers(): Blocker[] {
    const project = this.state.getProject();
    if (!project) return [];
    return project.blockers.filter((b) => !b.resolved);
  }

  getResolvedBlockers(): Blocker[] {
    const project = this.state.getProject();
    if (!project) return [];
    return project.blockers.filter((b) => b.resolved);
  }

  addBlocker(description: string, severity: Blocker['severity'], category: BlockerCategory = 'unknown'): void {
    const project = this.state.getProject();
    if (!project) return;
    const blocker: Blocker = {
      description,
      severity,
      category,
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    project.blockers.push(blocker);
    this.state.updateProject({ blockers: project.blockers });
  }

  resolveBlocker(index: number, resolution?: string): void {
    const project = this.state.getProject();
    if (!project) return;
    if (project.blockers[index]) {
      project.blockers[index].resolved = true;
      project.blockers[index].resolvedAt = new Date().toISOString();
      project.blockers[index].resolution = resolution || 'Manually resolved';
      this.state.updateProject({ blockers: project.blockers });
    }
  }

  getBlockerSummary(): string {
    const blockers = this.getActiveBlockers();
    if (blockers.length === 0) return 'No active blockers.';

    const critical = blockers.filter((b) => b.severity === 'critical').length;
    const high = blockers.filter((b) => b.severity === 'high').length;
    const medium = blockers.filter((b) => b.severity === 'medium').length;

    const byCategory = new Map<BlockerCategory, number>();
    blockers.forEach((b) => byCategory.set(b.category, (byCategory.get(b.category) || 0) + 1));
    const topCategory = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];

    const parts: string[] = [`${blockers.length} active blocker(s):`];
    if (critical > 0) parts.push(`  ${critical} critical`);
    if (high > 0) parts.push(`  ${high} high`);
    if (medium > 0) parts.push(`  ${medium} medium`);
    if (topCategory) parts.push(`  Most common category: ${topCategory[0]} (${topCategory[1]})`);

    return parts.join('\n');
  }

  hasCriticalBlockers(): boolean {
    return this.getActiveBlockers().some((b) => b.severity === 'critical');
  }

  getBlockersByCategory(category: BlockerCategory): Blocker[] {
    return this.getActiveBlockers().filter((b) => b.category === category);
  }

  predictRecurringBlockers(): string[] {
    const project = this.state.getProject();
    if (!project) return [];

    const categoryCount = new Map<BlockerCategory, number>();
    for (const blocker of project.blockers) {
      categoryCount.set(blocker.category, (categoryCount.get(blocker.category) || 0) + 1);
    }

    const warnings: string[] = [];
    for (const [category, count] of categoryCount) {
      if (count >= 3) {
        warnings.push(`Recurring ${category} blockers (${count} times). Consider addressing the root cause.`);
      }
    }
    return warnings;
  }

  getBlockTrend(): { up: boolean; percentage: number } {
    const project = this.state.getProject();
    if (!project) return { up: false, percentage: 0 };

    const recent = project.blockers.filter((b) => {
      const hours = (Date.now() - new Date(b.timestamp).getTime()) / (1000 * 60 * 60);
      return hours < 2;
    });

    const total = project.blockers.length;
    if (total === 0) return { up: false, percentage: 0 };

    return {
      up: recent.length > 0,
      percentage: Math.round((recent.length / total) * 100),
    };
  }
}
