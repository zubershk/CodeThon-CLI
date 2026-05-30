import { executeCommand } from './executor';
import { isAllowedCommand } from '../security/policy';
export { executeCommand, isAllowedCommand };
export type { ExecResult } from './executor';

const activeRuntime = { name: 'local' as const };

export function getRuntime() {
  return {
    name: activeRuntime.name,
    execute(cmd: string, timeout?: number) {
      return executeCommand(cmd, timeout);
    },
  };
}
