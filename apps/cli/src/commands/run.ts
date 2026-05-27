import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { TerminalPreview, renderTerminalBox, renderTerminalLine, renderTerminalClose } from '../utils/terminal-preview';
import { requireApproval } from '../utils/approval';
import { logger } from '../utils';

export async function runCommand(command: string[], askMode = false): Promise<CommandResult> {
  if (command.length === 0) {
    logger.error('No command specified. Usage: ct run <command>');
    return { success: false, message: 'No command specified' };
  }

  const cmd = command.join(' ');
  logger.section(`CodeThon CLI — Run: ${chalk.bold(cmd)}`);

  // Approval check
  if (askMode) {
    const approved = await requireApproval({
      type: 'command',
      description: cmd,
      details: `Directory: ${process.cwd()}`,
      risk: cmd.startsWith('rm ') || cmd.startsWith('sudo ') ? 'high' : 'medium',
    });
    if (!approved) {
      logger.info(`${chalk.yellowBright('\u26A0')} Command cancelled`);
      return { success: false, message: 'Command rejected by user' };
    }
  }

  const preview = new TerminalPreview();
  renderTerminalBox('TERMINAL OUTPUT');

  let stdout = '';
  let stderr = '';

  const result = await preview.run(
    cmd,
    process.cwd(),
    (line, stream) => {
      renderTerminalLine(line, stream);
      if (stream === 'stdout') stdout += line + '\n';
      else stderr += line + '\n';
    },
    120000
  );

  renderTerminalClose(result);

  return {
    success: result.success,
    message: result.success ? 'Command completed' : `Command failed (exit: ${result.exitCode})`,
    data: { stdout, stderr, exitCode: result.exitCode },
  };
}
