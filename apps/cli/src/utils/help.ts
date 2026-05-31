import chalk from 'chalk';
import { printActionHints, printHero } from './experience';
import { COMMAND_CATEGORIES, formatCliUsage, formatSlashUsage } from './command-registry';
import { CODETHON_VERSION } from './version';

export function showCategorizedHelp(): void {
  printHero(
    'CodeThon CLI',
    'AI-native execution orchestration for building, debugging, and shipping software from the terminal.',
    'ready',
    'Command guide',
  );

  printActionHints('Most common flows', [
    { command: 'auth add', description: 'Connect a hosted provider or local model first.' },
    { command: 'init', description: 'Describe the project you want to build.' },
    { command: 'plan', description: 'Generate a roadmap and architecture before coding.' },
    { command: 'execute "<goal>"', description: 'Run the autonomous execution workspace.' },
  ]);
  console.log('');

  for (const cat of COMMAND_CATEGORIES) {
    const entries = cat.entries.filter(entry => !entry.replOnly);
    if (entries.length === 0) continue;
    console.log(`  ${chalk.hex('#dfff72').bold(cat.title)}`);
    console.log(`  ${chalk.hex('#899691')(cat.description)}`);
    for (const entry of entries) {
      const usage = formatCliUsage(entry);
      const cmd = chalk.hex('#74d7ff')(usage);
      const padding = ' '.repeat(Math.max(1, 32 - usage.length));
      console.log(`    ${cmd}${padding}${chalk.hex('#899691')(entry.description)}`);
    }
    console.log('');
  }

  console.log(`  ${chalk.hex('#899691')('Flags:')}`);
  console.log(`    ${chalk.hex('#ffcf5c')('-o, --output')}  ${chalk.hex('#899691')('output format (text | json)')}`);
  console.log(`    ${chalk.hex('#ffcf5c')('-a, --ask')}     ${chalk.hex('#899691')('require approval for destructive operations')}`);
  console.log(`    ${chalk.hex('#ffcf5c')('-n, --dry-run')} ${chalk.hex('#899691')('show what would be done without making changes')}`);
  console.log(`    ${chalk.hex('#ffcf5c')('--tui')}         ${chalk.hex('#899691')('use the terminal workspace when supported')}`);
  console.log(`    ${chalk.hex('#ffcf5c')('--no-tui')}      ${chalk.hex('#899691')('force scrollback-safe line output')}`);
  console.log(`    ${chalk.hex('#ffcf5c')('--debug')}       ${chalk.hex('#899691')('enable verbose debug output')}`);
  console.log('');
  console.log(`  ${chalk.hex('#899691')('Version:')} ${CODETHON_VERSION}`);
  console.log('');
}

export function showCategorizedReplHelp(): void {
  printHero(
    'CodeThon REPL',
    'Slash commands are for explicit control. Plain English input goes straight to the AI.',
    'ready',
    'Interactive mode',
  );

  printActionHints('Best places to start', [
    { command: 'auth add', description: 'Connect a provider if the REPL says setup is needed.' },
    { command: 'init', description: 'Create or register a project workspace.' },
    { command: 'plan', description: 'Have the AI turn an idea into a roadmap.' },
    { command: 'execute "<goal>"', description: 'Run the autonomous agent against a concrete goal.' },
  ], '/');
  console.log('');

  for (const cat of COMMAND_CATEGORIES) {
    console.log(`  ${chalk.hex('#dfff72').bold(cat.title)}`);
    console.log(`  ${chalk.hex('#899691')(cat.description)}`);
    for (const entry of cat.entries) {
      const usage = formatSlashUsage(entry);
      const padding = ' '.repeat(Math.max(1, 26 - usage.length));
      console.log(`    ${chalk.hex('#82f7a6')(usage)}${padding}${chalk.hex('#899691')(entry.description)}`);
    }
    console.log('');
  }

  console.log(`  ${chalk.hex('#899691')('Or just type any question to use the AI directly.')}`);
  console.log('');
}
