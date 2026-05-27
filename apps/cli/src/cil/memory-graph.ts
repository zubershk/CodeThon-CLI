import type { MemoryNode, MemoryConnection, MemoryNodeType } from '@codethon/shared-types';
import { StateManager } from './state-manager';

export class MemoryGraph {
  private state: StateManager;

  constructor() {
    this.state = new StateManager();
  }

  addNode(type: MemoryNodeType, content: string, tags: string[] = []): MemoryNode {
    const project = this.state.getProjectOrThrow();
    const node: MemoryNode = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      content,
      tags,
      timestamp: new Date().toISOString(),
      connections: [],
    };

    project.memoryGraph.push(node);
    this.state.updateProject({ memoryGraph: project.memoryGraph });
    return node;
  }

  connect(sourceId: string, targetId: string, relationship: MemoryConnection['relationship']): void {
    const project = this.state.getProjectOrThrow();
    const source = project.memoryGraph.find((n) => n.id === sourceId);
    if (source) {
      source.connections.push({ targetId, relationship });
      this.state.updateProject({ memoryGraph: project.memoryGraph });
    }
  }

  findRelated(query: string, type?: MemoryNodeType, limit = 5): MemoryNode[] {
    const project = this.state.getProject();
    if (!project) return [];

    const lower = query.toLowerCase();
    return project.memoryGraph
      .filter((n) => {
        if (type && n.type !== type) return false;
        return (
          n.content.toLowerCase().includes(lower) ||
          n.tags.some((t) => t.toLowerCase().includes(lower))
        );
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getBlockerPatterns(): { pattern: string; count: number }[] {
    const project = this.state.getProject();
    if (!project) return [];

    const blockers = project.memoryGraph.filter((n) => n.type === 'blocker');
    const patternMap = new Map<string, number>();

    for (const blocker of blockers) {
      for (const tag of blocker.tags) {
        patternMap.set(tag, (patternMap.get(tag) || 0) + 1);
      }
    }

    return Array.from(patternMap.entries())
      .map(([pattern, count]) => ({ pattern, count }))
      .sort((a, b) => b.count - a.count);
  }

  getResolvedPatterns(): { fix: string; count: number }[] {
    const project = this.state.getProject();
    if (!project) return [];

    const fixes = project.memoryGraph.filter((n) => n.type === 'fix');
    const fixMap = new Map<string, number>();

    for (const fix of fixes) {
      const short = fix.content.slice(0, 100);
      fixMap.set(short, (fixMap.get(short) || 0) + 1);
    }

    return Array.from(fixMap.entries())
      .map(([fix, count]) => ({ fix, count }))
      .sort((a, b) => b.count - a.count);
  }

  getRecentDecisions(n = 5): MemoryNode[] {
    const project = this.state.getProject();
    if (!project) return [];
    return project.memoryGraph
      .filter((n) => n.type === 'decision')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, n);
  }
}
