import { spawnSync } from 'child_process';
import { isAllowedCommand } from '../security/policy';

export interface ExecResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function executeCommand(command: string, timeoutMs = 30000): ExecResult {
  const check = isAllowedCommand(command);
  if (!check.allowed) {
    return { success: false, stdout: '', stderr: check.reason || 'Command not allowed', exitCode: 1 };
  }

  const parts = command.split(/\s+/);
  const bin = parts[0];
  const args = parts.slice(1);
  const isWin = process.platform === 'win32';
  const winCmdWrappers = new Set(['npm', 'npx', 'pnpm', 'yarn', 'next', 'vite', 'tsc', 'prettier', 'gh', 'code']);
  const needsShell = isWin && winCmdWrappers.has(bin);
  const spawnBin = needsShell ? `${bin}.cmd` : bin;

  try {
    const result = spawnSync(spawnBin, args, {
      timeout: timeoutMs,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024,
      shell: needsShell,
    });

    if (result.error) throw result.error;
    return { success: result.status === 0, stdout: (result.stdout ?? '').trim(), stderr: (result.stderr ?? '').trim(), exitCode: result.status };
  } catch (error: unknown) {
    if (error instanceof Error) {
      const err = error as Error & { stderr?: string; stdout?: string; status?: number };
      return {
        success: false,
        stdout: err.stdout?.toString() || '',
        stderr: err.stderr?.toString() || err.message,
        exitCode: err.status ?? 1,
      };
    }
    return { success: false, stdout: '', stderr: 'Unknown execution error', exitCode: 1 };
  }
}
