import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { RecoverySystem } from '../features/recovery';
import { logger } from '../utils';

export async function checkpointCommand(...args: string[]): Promise<CommandResult> {
  const recovery = new RecoverySystem(process.cwd());
  let sub = args[0]?.toLowerCase();

  if (!sub || sub === 'help') {
    logger.section('Recovery Points');
    const cmds = [
      ['list', 'Show all saved recovery points'],
      ['save', '<desc>  Capture a snapshot of current project state'],
      ['restore', '<id>    Restore files from a recovery point'],
    ];
    for (let i = 0; i < cmds.length; i++) {
      logger.info(`  ${chalk.hex('#74d7ff')(`[${i + 1}]`)} ${chalk.hex('#f7fff9')(cmds[i][0].padEnd(9))} ${chalk.hex('#899691')(cmds[i][1])}`);
    }
    console.log('');
    logger.info(chalk.hex('#899691')('  Type /checkpoint <number> or /checkpoint <name>, e.g. /checkpoint 1 or /checkpoint list'));
    return { success: true, message: 'Checkpoint commands listed' };
  }

  // Number alias: /checkpoint 1 -> list
  const numIndex = parseInt(sub, 10);
  const numMap = ['list', 'save', 'restore'];
  if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= numMap.length) {
    sub = numMap[numIndex - 1];
  }

  if (sub === 'list') {
    const history = recovery.getHistory();
    logger.section('Recovery Points');
    if (history.length === 0) { logger.info(chalk.hex('#899691')('No recovery points found. Use /checkpoint save to create one.')); return { success: true, message: 'No points' }; }
    for (const h of history) {
      const date = new Date(h.timestamp).toLocaleString();
      logger.info(`  ${chalk.hex('#74d7ff')(h.id)}  ${chalk.hex('#899691')(date)}  ${h.description}`);
    }
    return { success: true, message: `${history.length} point(s)` };
  }

  if (sub === 'save' || sub === 'capture') {
    const desc = args.slice(1).join(' ') || `Checkpoint ${Date.now()}`;
    logger.highlight('Capturing recovery point...');
    const id = await recovery.capturePoint(desc);
    logger.success(`Saved: ${chalk.hex('#74d7ff')(id)} — ${desc}`);
    return { success: true, message: `Saved ${id}` };
  }

  if (sub === 'restore') {
    const id = args[1];
    if (!id) { logger.warn('Usage: /checkpoint restore <id>'); return { success: false, message: 'Missing ID' }; }
    logger.warn(`Restoring ${id}...`);
    const point = recovery.restore(id);
    if (!point) { logger.error('Recovery point not found'); return { success: false, message: 'Not found' }; }
    logger.success(`Restored ${point.files.length} file(s) from ${id}`);
    return { success: true, message: `Restored ${id}` };
  }

  logger.warn('Unknown subcommand. Try /checkpoint for available commands');
  return { success: false, message: 'Unknown subcommand' };
}
