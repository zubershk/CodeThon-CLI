export type CommandCategoryName =
  | 'Start'
  | 'Configure'
  | 'Plan'
  | 'Build'
  | 'Inspect'
  | 'Ship'
  | 'Operate';

export interface CommandEntry {
  name: string;
  usage: string;
  slash: string;
  description: string;
  category: CommandCategoryName;
  requiresAI?: boolean;
  requiresArg?: boolean;
  aliases?: string[];
  replOnly?: boolean;
}

export interface CommandCategory {
  name: CommandCategoryName;
  title: string;
  description: string;
  entries: CommandEntry[];
}

export const COMMAND_CATEGORIES: CommandCategory[] = [
  {
    name: 'Start',
    title: 'Start',
    description: 'Get a workspace ready and choose what CodeThon should do next.',
    entries: [
      { name: 'init', usage: 'init', slash: '/init', description: 'Create or register a project workspace.', category: 'Start' },
      { name: 'status', usage: 'status', slash: '/status', description: 'Show project, model, health, and next actions.', category: 'Start' },
      { name: 'doctor', usage: 'doctor', slash: '/doctor', description: 'Check Node, Git, config, auth, network, and local health.', category: 'Start' },
    ],
  },
  {
    name: 'Configure',
    title: 'Configure',
    description: 'Control authentication, providers, models, and setup state.',
    entries: [
      { name: 'auth', usage: 'auth add', slash: '/auth add', description: 'Add and validate provider credentials.', category: 'Configure' },
      { name: 'auth', usage: 'auth list', slash: '/auth list', description: 'List configured providers and active defaults.', category: 'Configure' },
      { name: 'auth', usage: 'auth test [provider]', slash: '/auth test [provider]', description: 'Test provider credentials and reachability.', category: 'Configure' },
      { name: 'auth', usage: 'auth switch', slash: '/auth switch', description: 'Switch active provider and model.', category: 'Configure' },
      { name: 'model', usage: 'model', slash: '/model', description: 'Browse models and change the active model.', category: 'Configure' },
      { name: 'onboard', usage: 'onboard', slash: '/onboard', description: 'Run the guided first-run setup again.', category: 'Configure' },
    ],
  },
  {
    name: 'Plan',
    title: 'Plan',
    description: 'Turn ideas and existing code into a concrete implementation path.',
    entries: [
      { name: 'plan', usage: 'plan [goal]', slash: '/plan [goal]', description: 'Generate roadmap and architecture together.', category: 'Plan', requiresAI: true },
      { name: 'roadmap', usage: 'roadmap', slash: '/roadmap', description: 'Generate project phases, milestones, and priorities.', category: 'Plan', requiresAI: true },
      { name: 'architect', usage: 'architect', slash: '/architect', description: 'Design architecture, data flow, and technical choices.', category: 'Plan', requiresAI: true },
      { name: 'analyze', usage: 'analyze [dir]', slash: '/analyze [dir]', description: 'Analyze a codebase and surface issues or missing pieces.', category: 'Plan', requiresAI: true },
    ],
  },
  {
    name: 'Build',
    title: 'Build',
    description: 'Make changes, run tools, test, debug, and recover.',
    entries: [
      { name: 'execute', usage: 'execute <goal>', slash: '/execute <goal>', description: 'Run the autonomous execution workspace with live trace, context, checkpoints, and receipt.', category: 'Build', requiresAI: true, requiresArg: true, aliases: ['auto'] },
      { name: 'build', usage: 'build [goal]', slash: '/build [goal]', description: 'Generate and apply code with build-error repair.', category: 'Build', requiresAI: true },
      { name: 'debug', usage: 'debug', slash: '/debug', description: 'Collect errors and ask the AI for targeted fixes.', category: 'Build', requiresAI: true },
      { name: 'autofix', usage: 'autofix', slash: '/autofix', description: 'Run build checks and apply focused fixes.', category: 'Build', requiresAI: true },
      { name: 'run', usage: 'run <cmd>', slash: '/run <cmd>', description: 'Run a shell command through CodeThon policy gates.', category: 'Build' },
      { name: 'scaffold', usage: 'scaffold [dir]', slash: '/scaffold [dir]', description: 'Create a starter app from a template.', category: 'Build' },
    ],
  },
  {
    name: 'Inspect',
    title: 'Inspect',
    description: 'Understand project state, files, diffs, tests, and performance.',
    entries: [
      { name: 'review', usage: 'review', slash: '/review', description: 'Review current git changes.', category: 'Inspect' },
      { name: 'diff', usage: 'diff', slash: '/diff', description: 'Show the full git diff for current changes.', category: 'Inspect' },
      { name: 'explain', usage: 'explain <file>', slash: '/explain <file>', description: 'Explain a file and its role in the project.', category: 'Inspect', requiresAI: true, requiresArg: true },
      { name: 'summarize', usage: 'summarize', slash: '/summarize', description: 'Summarize project health, blockers, and priorities.', category: 'Inspect', requiresAI: true },
      { name: 'profile', usage: 'profile', slash: '/profile', description: 'Find performance issues and code smells.', category: 'Inspect' },
      { name: 'memory', usage: 'memory [query]', slash: '/memory [query]', description: 'Explore persistent project memory.', category: 'Inspect' },
      { name: 'analytics', usage: 'analytics', slash: '/analytics', description: 'Show execution reliability and productivity metrics.', category: 'Inspect' },
      { name: 'graph', usage: 'graph [dir]', slash: '/graph [dir]', description: 'Visualize repository architecture and dependencies.', category: 'Inspect' },
      { name: 'git', usage: 'git', slash: '/git', description: 'Git status, diff, branch, review, and PR helpers.', category: 'Inspect' },
      { name: 'test', usage: 'test', slash: '/test', description: 'Generate tests, inspect coverage, and run test workflows.', category: 'Inspect' },
      { name: 'sessions', usage: 'sessions', slash: '/sessions', description: 'Open the execution session dashboard.', category: 'Inspect' },
      { name: 'inspect', usage: 'inspect [runId]', slash: '/inspect [runId]', description: 'Inspect a persisted execution journal.', category: 'Inspect' },
      { name: 'replay', usage: 'replay [runId]', slash: '/replay [runId]', description: 'Replay an execution event timeline.', category: 'Inspect' },
    ],
  },
  {
    name: 'Ship',
    title: 'Ship',
    description: 'Prepare documentation, deployment, launch, and product positioning.',
    entries: [
      { name: 'deploy', usage: 'deploy', slash: '/deploy', description: 'Prepare deployment guidance and history.', category: 'Ship', requiresAI: true },
      { name: 'readme', usage: 'readme', slash: '/readme', description: 'Generate or refresh README.md.', category: 'Ship', requiresAI: true },
      { name: 'launch', usage: 'launch', slash: '/launch', description: 'Create demo script, social posts, and submission copy.', category: 'Ship', requiresAI: true },
      { name: 'startup', usage: 'startup', slash: '/startup', description: 'Analyze business potential and go-to-market direction.', category: 'Ship', requiresAI: true },
    ],
  },
  {
    name: 'Operate',
    title: 'Operate',
    description: 'Control the session, recovery points, and learning loop.',
    entries: [
      { name: 'checkpoint', usage: 'checkpoint', slash: '/checkpoint', description: 'Save, list, and restore recovery points.', category: 'Operate' },
      { name: 'recover', usage: 'recover', slash: '/recover', description: 'Rebuild project context from files and config.', category: 'Operate', requiresAI: true },
      { name: 'emergency', usage: 'emergency', slash: '/emergency', description: 'Last-minute recovery for broken project state.', category: 'Operate' },
      { name: 'learn', usage: 'learn', slash: '/learn', description: 'Ask a concept question and get a guided tutorial.', category: 'Operate', requiresAI: true },
      { name: 'help', usage: 'help', slash: '/help', description: 'Open the full command guide.', category: 'Operate', aliases: ['commands', '?'] },
      { name: 'clear', usage: 'clear', slash: '/clear', description: 'Clear the terminal.', category: 'Operate' },
      { name: 'exit', usage: 'exit', slash: '/exit', description: 'Exit the interactive session.', category: 'Operate', aliases: ['quit'], replOnly: true },
    ],
  },
];

export const COMMAND_ENTRIES: CommandEntry[] = COMMAND_CATEGORIES.flatMap(category => category.entries);
export const CLI_COMMAND_ENTRIES: CommandEntry[] = COMMAND_ENTRIES.filter(entry => !entry.replOnly);

export const UNIQUE_COMMANDS: CommandEntry[] = Array.from(
  COMMAND_ENTRIES.reduce((map, entry) => {
    if (!map.has(entry.name)) map.set(entry.name, entry);
    return map;
  }, new Map<string, CommandEntry>()).values(),
);

export const AI_COMMAND_NAMES = new Set(
  UNIQUE_COMMANDS.filter(entry => entry.requiresAI).map(entry => entry.name),
);

export function getCommandByName(name: string): CommandEntry | undefined {
  const normalized = name.replace(/^\//, '').toLowerCase();
  return UNIQUE_COMMANDS.find(entry =>
    entry.name === normalized ||
    entry.aliases?.some(alias => alias.toLowerCase() === normalized)
  );
}

export function findCommandSuggestions(query: string): CommandEntry[] {
  return findScopedCommandSuggestions(query, 'all');
}

export function findScopedCommandSuggestions(query: string, scope: 'all' | 'cli' | 'repl' = 'all'): CommandEntry[] {
  const normalized = query.trim().replace(/^\//, '').toLowerCase();
  const source = scope === 'cli'
    ? UNIQUE_COMMANDS.filter(entry => !entry.replOnly)
    : UNIQUE_COMMANDS;
  if (!normalized) return source;

  const prefixMatches = source.filter(entry =>
    entry.name.startsWith(normalized) ||
    entry.aliases?.some(alias => alias.startsWith(normalized))
  );
  if (prefixMatches.length > 0) return prefixMatches;

  return source
    .map(entry => ({ entry, score: fuzzyScore(normalized, entry.name) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.entry);
}

export function formatSlashUsage(entry: CommandEntry): string {
  return entry.slash;
}

export function formatCliUsage(entry: CommandEntry): string {
  return `ct ${entry.usage}`;
}

function fuzzyScore(input: string, target: string): number {
  if (!input) return 1;
  if (target.startsWith(input)) return 1000 + target.length;
  if (target.includes(input)) return 500 - target.indexOf(input);

  let score = 0;
  let ti = 0;
  for (let ai = 0; ai < input.length && ti < target.length; ai++) {
    while (ti < target.length && target[ti] !== input[ai]) ti++;
    if (ti < target.length) {
      score += 10;
      ti++;
    }
  }
  return score;
}
