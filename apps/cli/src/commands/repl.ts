import readline from 'readline';
import chalk from 'chalk';
import { StateManager } from '../cil/state-manager';
import { getLLMConfig } from '../utils/config';
import { logger } from '../utils';
import { naturalLanguageCommand } from './nl';
import { statusCommand } from './status';
import { diffCommand } from './diff';
import { reviewCommand } from './review';
import { clearCommand } from './clear';
import { doctorCommand } from './doctor';
import { summarizeCommand } from './summarize';

const SLASH_COMMANDS = [
  { cmd: '/help', desc: 'Show available commands' },
  { cmd: '/status', desc: 'Show project status & health' },
  { cmd: '/doctor', desc: 'Run project diagnostics' },
  { cmd: '/summarize', desc: 'Generate project summary' },
  { cmd: '/review', desc: 'Review current changes' },
  { cmd: '/diff', desc: 'Show full diff' },
  { cmd: '/clear', desc: 'Clear terminal' },
  { cmd: '/exit', desc: 'Exit REPL' },
  { cmd: '/quit', desc: 'Exit REPL' },
];

function contextBanner(): void {
  const state = new StateManager();
  const project = state.getProject();
  const llm = getLLMConfig();

  const parts: string[] = [];
  if (project) {
    parts.push(chalk.cyanBright(`Project: ${chalk.whiteBright(project.name)}`));
    parts.push(chalk.cyanBright(`Stack: ${chalk.whiteBright(project.stack)}`));
    parts.push(chalk.cyanBright(`Phase: ${chalk.whiteBright(project.sprintPhase)}`));
    if (project.healthScore) {
      const h = project.healthScore.overall;
      const color = h >= 80 ? chalk.greenBright : h >= 50 ? chalk.yellowBright : chalk.redBright;
      parts.push(chalk.cyanBright(`Health: ${color(`${h}%`)}`));
    }
  }
  parts.push(chalk.cyanBright(`Model: ${chalk.whiteBright(llm.model || 'not set')}`));

  const line = chalk.dim('\u2500'.repeat(56));
  console.log(`  ${line}`);
  console.log(`  ${parts.join(` ${chalk.dim('\u2503')} `)}`);
  console.log(`  ${line}`);
  console.log('');
}

function showHelp(): void {
  console.log('');
  logger.section('CodeThon REPL — Commands');
  for (const { cmd, desc } of SLASH_COMMANDS) {
    logger.commandBlock(cmd, desc);
  }
  logger.divider();
  logger.bullet('Type any question for natural language AI assistance');
  logger.bullet('Type "ct <command>" to execute any CLI command');
  console.log('');
}

function getContext(): { projectName: string; stack: string; phase: string; health: number | null } {
  const state = new StateManager();
  const project = state.getProject();
  return {
    projectName: project?.name || '',
    stack: project?.stack || '',
    phase: project?.sprintPhase || '',
    health: project?.healthScore?.overall ?? null,
  };
}

export async function replCommand(): Promise<void> {
  const ct = chalk.bold.magentaBright('CodeThon');
  const prompt = chalk.cyanBright(`${ct} ${chalk.dim('>')} `);

  console.log('');
  logger.highlight('CodeThon REPL — persistent execution-aware mode');
  logger.info('Type /help for commands, or just ask anything.');
  logger.info('');

  contextBanner();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt,
    terminal: true,
    historySize: 100,
    removeHistoryDuplicates: true,
  });

  const completer = (line: string): [string[], string] => {
    const hits = SLASH_COMMANDS
      .map(c => c.cmd)
      .filter(c => c.startsWith(line.toLowerCase()));
    return [hits.length ? hits : SLASH_COMMANDS.map(c => c.cmd), line];
  };
  (rl as any).completer = completer;

  rl.on('line', async (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) {
      rl.prompt();
      return;
    }

    // Slash commands
    if (trimmed.startsWith('/')) {
      const [cmd, ...args] = trimmed.split(/\s+/);
      switch (cmd) {
        case '/help':
          showHelp();
          break;
        case '/status':
          await statusCommand();
          break;
        case '/doctor':
          await doctorCommand();
          break;
        case '/summarize':
          await summarizeCommand();
          break;
        case '/review':
          await reviewCommand();
          break;
        case '/diff':
          await diffCommand();
          break;
        case '/clear':
          clearCommand();
          break;
        case '/exit':
        case '/quit':
          console.log('');
          logger.info('Goodbye.');
          console.log('');
          rl.close();
          process.exit(0);
          return;
        default:
          logger.warn(`Unknown command: ${cmd}. Type /help for available commands.`);
      }
      rl.prompt();
      return;
    }

    // "ct <something>" — execute as CLI command
    const ctMatch = trimmed.match(/^ct\s+(.+)/);
    if (ctMatch) {
      logger.warn('Command execution from REPL coming soon. Use the CLI directly for now.');
      logger.info(`  ct ${ctMatch[1]}`);
      rl.prompt();
      return;
    }

    // Free text — route to NL handler
    try {
      await naturalLanguageCommand(trimmed);
    } catch (e: any) {
      logger.error(`Error: ${e.message}`);
    }

    console.log('');
    contextBanner();
    rl.prompt();
  });

  rl.on('close', () => {
    console.log('');
    process.exit(0);
  });

  // Handle SIGINT (Ctrl+C) gracefully
  rl.on('SIGINT', () => {
    rl.question(chalk.yellow('\n  Exit REPL? (y/N) '), (answer: string) => {
      if (answer.toLowerCase() === 'y') {
        rl.close();
      } else {
        rl.prompt();
      }
    });
  });

  rl.prompt();
}
