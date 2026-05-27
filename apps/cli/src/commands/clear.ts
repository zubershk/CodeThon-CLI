import type { CommandResult } from '@codethon/shared-types';

export async function clearCommand(): Promise<CommandResult> {
  process.stdout.write('\x1Bc');
  return { success: true, message: 'Terminal cleared' };
}
