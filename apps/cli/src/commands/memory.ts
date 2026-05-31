import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { logger } from '../utils';
import { renderMemoryExplorer } from '../ui/supernova';

export async function memoryCommand(...args: string[]): Promise<CommandResult> {
  const state = new StateManager();
  const project = state.getProject();
  const [subcommand, ...rest] = args;

  if (subcommand === 'delete') {
    const id = rest[0];
    if (!project) {
      logger.warn('No active project memory.');
      return { success: false, message: 'No active project memory' };
    }
    if (!id) {
      logger.warn('Usage: ct memory delete <id>');
      return { success: false, message: 'Missing memory id' };
    }
    const before = project.memoryGraph.length;
    const next = project.memoryGraph.filter(node => node.id !== id);
    if (next.length === before) {
      logger.warn(`Memory entry not found: ${id}`);
      return { success: false, message: `Memory entry not found: ${id}` };
    }
    state.updateProject({ memoryGraph: next });
    logger.success(`Deleted memory entry: ${id}`);
    return { success: true, message: `Deleted ${id}` };
  }

  if (subcommand === 'search') {
    renderMemoryExplorer(project, rest.join(' '));
    return { success: true, message: 'Memory search displayed' };
  }

  renderMemoryExplorer(project, args.join(' '));
  return { success: true, message: 'Memory explorer displayed' };
}
