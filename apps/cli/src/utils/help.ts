import chalk from 'chalk';

interface HelpEntry {
  cmd: string;
  desc: string;
}

interface HelpCategory {
  name: string;
  entries: HelpEntry[];
}

const CATEGORIES: HelpCategory[] = [
  {
    name: 'Project Setup',
    entries: [
      { cmd: 'init', desc: 'Initialize a new CodeThon project' },
      { cmd: 'model', desc: 'Switch the AI model' },
      { cmd: 'scaffold [dir]', desc: 'Scaffold a starter project from a template' },
      { cmd: 'deploy', desc: 'Deploy to Vercel' },
    ],
  },
  {
    name: 'Planning & Design',
    entries: [
      { cmd: 'roadmap', desc: 'Generate project roadmap and milestones' },
      { cmd: 'architect', desc: 'Design architecture and stack recommendations' },
      { cmd: 'analyze [dir]', desc: 'Deep codebase analysis' },
    ],
  },
  {
    name: 'Development',
    entries: [
      { cmd: 'build [goal]', desc: 'Build code and auto-fix errors' },
      { cmd: 'autofix', desc: 'Auto-fix build errors in project files' },
      { cmd: 'execute <goal>', desc: 'Autonomous agent: loops, builds, fixes until done' },
      { cmd: 'run <cmd>', desc: 'Run a shell command with live output' },
      { cmd: 'debug', desc: 'Debug build errors' },
      { cmd: 'emergency', desc: 'Emergency recovery for last-minute crashes' },
      { cmd: 'recover', desc: 'Scan repo and restore execution awareness' },
    ],
  },
  {
    name: 'Review & Diagnostics',
    entries: [
      { cmd: 'review', desc: 'Review current changes and find issues' },
      { cmd: 'diff', desc: 'Show full diff' },
      { cmd: 'status', desc: 'Show session config and project status' },
      { cmd: 'doctor', desc: 'Run project diagnostics (Node, deps, env)' },
      { cmd: 'explain <file>', desc: 'Analyze and explain any file' },
      { cmd: 'summarize', desc: 'Generate project status summary' },
    ],
  },
  {
    name: 'Content & Launch',
    entries: [
      { cmd: 'readme', desc: 'Generate README for your project' },
      { cmd: 'launch', desc: 'Generate launch assets (posts, demo, submission)' },
      { cmd: 'startup', desc: 'Analyze startup potential and strategy' },
    ],
  },
  {
    name: 'Learning',
    entries: [
      { cmd: 'learn', desc: 'Ask a question and get a guided tutorial' },
    ],
  },
  {
    name: 'Utilities',
    entries: [
      { cmd: 'clear', desc: 'Clear the terminal' },
      { cmd: 'help', desc: 'Show this categorized help' },
    ],
  },
];

export function showCategorizedHelp(): void {
  console.log('');
  console.log(`  ${chalk.bold('CodeThon CLI')} ${chalk.dim('— available commands')}`);
  console.log(`  ${chalk.dim('\u2500'.repeat(56))}`);
  console.log('');

  for (const cat of CATEGORIES) {
    console.log(`  ${chalk.bold.hex('#A78BFA')(cat.name)}`);
    for (const entry of cat.entries) {
      const cmd = chalk.cyanBright(`ct ${entry.cmd}`);
      const padding = ' '.repeat(Math.max(1, 28 - entry.cmd.length));
      console.log(`    ${cmd}${padding}${chalk.dim(entry.desc)}`);
    }
    console.log('');
  }

  console.log(`  ${chalk.dim('Flags:')}`);
  console.log(`    ${chalk.yellowBright('-o, --output')}  ${chalk.dim('output format (text | json)')}`);
  console.log(`    ${chalk.yellowBright('-a, --ask')}     ${chalk.dim('require approval for destructive operations')}`);
  console.log(`    ${chalk.yellowBright('-n, --dry-run')} ${chalk.dim('show what would be done without making changes')}`);
  console.log(`    ${chalk.yellowBright('--debug')}       ${chalk.dim('enable verbose debug output')}`);
  console.log('');
  console.log(`  ${chalk.dim('Tip: any unrecognized input is sent to the AI as natural language.')}`);
  console.log('');
}

export function showCategorizedReplHelp(): void {
  console.log('');
  console.log(`  ${chalk.bold('CodeThon REPL')} ${chalk.dim('— available slash commands')}`);
  console.log(`  ${chalk.dim('\u2500'.repeat(56))}`);
  console.log('');

  for (const cat of CATEGORIES) {
    console.log(`  ${chalk.bold.hex('#A78BFA')(cat.name)}`);
    for (const entry of cat.entries) {
      const cmd = chalk.greenBright(`/${entry.cmd.split(/\s+/)[0]}`);
      const padding = ' '.repeat(Math.max(1, 28 - entry.cmd.length));
      const desc = entry.cmd.includes('<') || entry.cmd.includes('[')
        ? `${entry.desc} ${chalk.dim(`(${entry.cmd.replace(/\S+\s+/, '')})`)}`
        : entry.desc;
      console.log(`    ${cmd}${padding}${chalk.dim(desc)}`);
    }
    console.log('');
  }

  console.log(`  ${chalk.dim('Or just type any question to use the AI directly.')}`);
  console.log(`  ${chalk.dim('Prefix with "ct " to run commands:')} ${chalk.greenBright('ct build')} ${chalk.dim('or')} ${chalk.greenBright('ct execute deploy my app')}`);
  console.log('');
}
