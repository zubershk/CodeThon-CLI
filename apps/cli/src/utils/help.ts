import chalk from 'chalk';
import { printActionHints, printHero } from './experience';
import { COMMAND_CATEGORIES, formatCliUsage, formatSlashUsage } from './command-registry';

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
    { command: 'execute "<goal>"', description: 'Let the agent work toward a concrete task.' },
  ]);
  console.log('');

  for (const cat of COMMAND_CATEGORIES) {
    const entries = cat.entries.filter(entry => !entry.replOnly);
    if (entries.length === 0) continue;
    console.log(`  ${chalk.bold.hex('#A78BFA')(cat.title)}`);
    console.log(`  ${chalk.dim(cat.description)}`);
    for (const entry of entries) {
      const usage = formatCliUsage(entry);
      const cmd = chalk.cyanBright(usage);
      const padding = ' '.repeat(Math.max(1, 32 - usage.length));
      console.log(`    ${cmd}${padding}${chalk.dim(entry.description)}`);
    }
    console.log('');
  }

  console.log(`  ${chalk.dim('Flags:')}`);
  console.log(`    ${chalk.yellowBright('-o, --output')}  ${chalk.dim('output format (text | json)')}`);
  console.log(`    ${chalk.yellowBright('-a, --ask')}     ${chalk.dim('require approval for destructive operations')}`);
  console.log(`    ${chalk.yellowBright('-n, --dry-run')} ${chalk.dim('show what would be done without making changes')}`);
  console.log(`    ${chalk.yellowBright('--debug')}       ${chalk.dim('enable verbose debug output')}`);
  console.log('');
  console.log(`  ${chalk.dim('Version:')} 1.0.0`);
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
    console.log(`  ${chalk.bold.hex('#A78BFA')(cat.title)}`);
    console.log(`  ${chalk.dim(cat.description)}`);
    for (const entry of cat.entries) {
      const usage = formatSlashUsage(entry);
      const padding = ' '.repeat(Math.max(1, 26 - usage.length));
      console.log(`    ${chalk.greenBright(usage)}${padding}${chalk.dim(entry.description)}`);
    }
    console.log('');
  }

  console.log(`  ${chalk.dim('Or just type any question to use the AI directly.')}`);
  console.log('');
}
