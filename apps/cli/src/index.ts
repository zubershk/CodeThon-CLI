#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';

import {
  initCommand,
  modelCommand,
  planCommand,
  roadmapCommand,
  architectCommand,
  scaffoldCommand,
  debugCommand,
  emergencyCommand,
  deployCommand,
  readmeCommand,
  launchCommand,
  startupCommand,
  learnCommand,
  statusCommand,
  reviewCommand,
  clearCommand,
  diffCommand,
  analyticsCommand,
  analyzeCommand,
  buildCommand,
  autofixCommand,
  runCommand,
  naturalLanguageCommand,
  executeCommand,
  doctorCommand,
  explainCommand,
  summarizeCommand,
  recoverCommand,
  gitCommand,
  testGenCommand,
  profileCommand,
  checkpointCommand,
  inspectCommand,
  replayCommand,
  graphCommand,
  memoryCommand,
  onboardCommand,
  authAddCommand,
  authListCommand,
  authTestCommand,
  authSwitchCommand,
  authRemoveCommand,
  authLogoutCommand,
} from './commands';
import { logger } from './utils';
import { GracefulShutdown } from './features/recovery';


import fs from 'fs';
import path from 'path';
import { PromptCancelledError } from './utils/prompt';
import { promptConfirm } from './utils/prompt';
import { CODETHON_VERSION } from './utils/version';
function loadDotenv(startDir: string): void {
  const candidate = path.join(startDir, '.env');
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: path.resolve(candidate), override: true });
  }
  const localCandidate = path.join(startDir, '.env.local');
  if (fs.existsSync(localCandidate)) {
    dotenv.config({ path: path.resolve(localCandidate), override: true });
  }
}
loadDotenv(process.cwd());

// Auto-detect repo root and restore session context
import { getLLMConfig, getRepoRoot, getSessionProjectId, getThemeMode, validateProviderConfig } from './utils/config';
import { printActionHints, printHero } from './utils/experience';
import { findScopedCommandSuggestions, formatCliUsage } from './utils/command-registry';
import { theme } from './ui/theme';
import { renderCommandWorkspaceSummary, shouldRenderCommandWorkspace } from './tui/ink-command-workspace';
const repoRoot = getRepoRoot();
if (repoRoot && !getSessionProjectId(repoRoot)) {
  // No active session for this repo — that's fine, new repos have no state
}

const shutdown = new GracefulShutdown();
shutdown.onShutdown(async () => {
  process.stdout.write('\n');
});

const program = new Command();

program
  .name('ct')
  .description('CodeThon CLI — AI-native execution orchestration for hackathons')
  .version(CODETHON_VERSION)
  .option('--debug', 'enable verbose debug output')
  .option('-o, --output <format>', 'output format (text|json)', 'text')
  .option('-a, --ask', 'require approval before running commands or modifying files')
  .option('-n, --dry-run', 'show what would be done without making changes')
  .option('--tui', 'force the terminal workspace when the terminal supports it')
  .option('--no-tui', 'use scrollback-safe line output instead of the terminal workspace');

async function ensureAiReady(commandName: string, output: string): Promise<{ success: boolean; message: string } | null> {
  const check = validateProviderConfig();
  if (check.ok) return null;

  console.log('');
  logger.warn(`${commandName} needs a configured AI provider before it can run.`);
  logger.info(check.message);
  printActionHints('Get ready', [
    { command: 'auth add', description: 'Connect a hosted provider or local model.' },
    { command: 'doctor', description: 'Verify environment, network, and secret storage.' },
    { command: 'onboard', description: 'Run the full guided setup flow.' },
  ]);

  if (!process.stdout.isTTY || !process.stdin.isTTY || output === 'json') {
    return { success: false, message: check.message };
  }

  const openSetup = await promptConfirm({
    message: 'Open the guided setup now?',
    defaultValue: true,
  });

  if (!openSetup) {
    return { success: false, message: check.message };
  }

  const result = await onboardCommand(false);
  if (!result.success) return result;

  const recheck = validateProviderConfig();
  if (!recheck.ok) {
    return { success: false, message: recheck.message };
  }

  return null;
}

function runHandler<T extends { success: boolean; message: string }>(fn: () => Promise<T>, options?: { requiresAI?: boolean; commandName?: string }): void {
  const output = program.getOptionValue('output') as string;
  const tuiEnabled = program.getOptionValue('tui') !== false;
  const commandName = options?.commandName || currentCommandLabel();
  const startedAt = Date.now();
  Promise.resolve()
    .then(async () => {
      if (options?.requiresAI) {
        const preflight = await ensureAiReady(commandName || 'This command', output);
        if (preflight) {
          return preflight as T;
        }
      }
      return fn();
    })
    .then(async result => {
    if (output === 'json') {
      console.log(JSON.stringify(result, null, 2));
    }
    if (shouldRenderCommandWorkspace(commandName, output, tuiEnabled)) {
      const llm = getLLMConfig();
      await renderCommandWorkspaceSummary({
        command: commandName,
        result,
        durationMs: Date.now() - startedAt,
        provider: llm.provider,
        model: llm.model || 'not set',
        cwd: process.cwd(),
      });
    }
    if (!result.success) process.exitCode = 1;
  }).catch(error => {
    if (error instanceof PromptCancelledError) {
      logger.warn('Cancelled.');
      process.exitCode = 1;
      return;
    }
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exitCode = 1;
  });
}

function currentCommandLabel(): string {
  const parts = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
  if (parts.length === 0) return 'ct';
  const first = parts[0].toLowerCase();
  if (['auth', 'git', 'test', 'checkpoint'].includes(first) && parts[1]) {
    return `ct ${parts[0]} ${parts[1]}`;
  }
  return `ct ${parts[0]}`;
}

program
  .command('init')
  .description('Initialize a new CodeThon project')
  .action(() => runHandler(() => initCommand()));

program
  .command('model')
  .description('Switch the AI model powering CodeThon agents')
  .action(() => runHandler(() => modelCommand()));

program
  .command('roadmap')
  .description('Generate project roadmap and milestones')
  .action(() => runHandler(() => roadmapCommand(), { requiresAI: true, commandName: 'ct roadmap' }));

program
  .command('architect')
  .description('Design architecture and stack recommendations')
  .action(() => runHandler(() => architectCommand(), { requiresAI: true, commandName: 'ct architect' }));

program
  .command('plan')
  .description('Generate combined roadmap + architecture plan')
  .argument('[goal...]', 'optional planning goal')
  .option('--stack <stack>', 'tech stack to plan for')
  .option('--feature <feature>', 'specific feature to plan')
  .action((goal: string[], opts?: { stack?: string; feature?: string }) => {
    const parts = [...(goal || [])];
    if (opts?.stack) parts.push('--stack', opts.stack);
    if (opts?.feature) parts.push('--feature', opts.feature);
    runHandler(() => planCommand(parts.join(' ')), { requiresAI: true, commandName: 'ct plan' });
  });

program
  .command('scaffold')
  .description('Scaffold a starter project')
  .argument('[directory]', 'target directory')
  .option('-t, --template <name>', 'template name (non-interactive)')
  .action((dir?: string, opts?: { template?: string }) => runHandler(() => scaffoldCommand(dir, opts?.template)));

program
  .command('debug')
  .description('Analyze errors and get fixes')
  .action(() => runHandler(() => debugCommand(), { requiresAI: true, commandName: 'ct debug' }));

program
  .command('emergency')
  .description('Emergency recovery for last-minute crashes')
  .action(() => runHandler(() => emergencyCommand()));

program
  .command('deploy')
  .description('Get deployment guidance')
  .action(() => runHandler(() => deployCommand(), { requiresAI: true, commandName: 'ct deploy' }));

program
  .command('readme')
  .description('Generate README for your project')
  .action(() => runHandler(() => readmeCommand(), { requiresAI: true, commandName: 'ct readme' }));

program
  .command('launch')
  .description('Generate launch assets (posts, demo, submission)')
  .action(() => runHandler(() => launchCommand(), { requiresAI: true, commandName: 'ct launch' }));

program
  .command('startup')
  .description('Analyze startup potential and generate business strategy')
  .action(() => runHandler(() => startupCommand(), { requiresAI: true, commandName: 'ct startup' }));

program
  .command('learn')
  .description('Ask a question and get a guided tutorial')
  .action(() => runHandler(() => learnCommand(), { requiresAI: true, commandName: 'ct learn' }));

program
  .command('status')
  .description('Show current session configuration and project status')
  .action(() => runHandler(() => statusCommand()));

program
  .command('review')
  .description('Review current changes and find issues')
  .action(() => runHandler(() => reviewCommand()));

program
  .command('diff')
  .description('Show full git diff for current changes')
  .action(() => runHandler(() => diffCommand()));

program
  .command('clear')
  .description('Clear the terminal')
  .action(() => runHandler(() => clearCommand().then(r => ({ ...r, success: true })))) ;

program
  .command('analyze')
  .description('Scan project structure, detect issues, generate summary')
  .argument('[directory]', 'target directory (default: auto-detect project)')
  .action((dir?: string) => runHandler(() => analyzeCommand(dir), { requiresAI: true, commandName: 'ct analyze' }));

program
  .command('build')
  .description('Autonomous build agent — generates code, writes files, fixes errors')
  .argument('[goal]', 'build goal (e.g. "add auth" or "fix the login page")')
  .action((goal?: string) => runHandler(() => {
    const ask = program.getOptionValue('ask') as boolean;
    const dryRun = program.getOptionValue('dryRun') as boolean;
    return buildCommand(goal, ask, dryRun);
  }, { requiresAI: true, commandName: 'ct build' }));

program
  .command('autofix')
  .description('Auto-detect build errors and fix them in project files')
  .action(() => runHandler(() => {
    const ask = program.getOptionValue('ask') as boolean;
    const dryRun = program.getOptionValue('dryRun') as boolean;
    return autofixCommand(ask, dryRun);
  }, { requiresAI: true, commandName: 'ct autofix' }));

program
  .command('execute')
  .description('Autonomous execution agent — loops, plans, researches, builds, fixes until goal is met')
  .argument('<goal...>', 'what to build or accomplish')
  .action((goal: string[]) => runHandler(() => {
    const ask = program.getOptionValue('ask') as boolean;
    const dryRun = program.getOptionValue('dryRun') as boolean;
    const tui = program.getOptionValue('tui') !== false;
    return executeCommand(goal.join(' '), ask, dryRun, tui);
  }, { requiresAI: true, commandName: 'ct execute' }));

program
  .command('auto', { hidden: true })
  .description('Compatibility alias for execute')
  .argument('<goal...>', 'what to build or accomplish')
  .action((goal: string[]) => runHandler(() => {
    const ask = program.getOptionValue('ask') as boolean;
    const dryRun = program.getOptionValue('dryRun') as boolean;
    const tui = program.getOptionValue('tui') !== false;
    return executeCommand(goal.join(' '), ask, dryRun, tui);
  }, { requiresAI: true, commandName: 'ct execute' }));

program
  .command('run')
  .description('Run a command with live terminal output')
  .argument('[cmd...]', 'command to execute')
  .action((cmd: string[]) => runHandler(() => {
    const askMode = program.getOptionValue('ask') as boolean;
    return runCommand(cmd, askMode);
  }));

program
  .command('doctor')
  .description('Run diagnostics — checks Node, config, auth, network, project')
  .action(() => runHandler(() => doctorCommand()));

program
  .command('explain')
  .description('Analyze and explain any file in the project')
  .argument('<file>', 'path to the file to explain')
  .action((file: string) => runHandler(() => explainCommand(file), { requiresAI: true, commandName: 'ct explain' }));

program
  .command('summarize')
  .description('Generate a structured project status summary')
  .action(() => runHandler(() => summarizeCommand(), { requiresAI: true, commandName: 'ct summarize' }));

program
  .command('recover')
  .description('Scan repo, rebuild context, restore execution awareness')
  .action(() => runHandler(() => recoverCommand(), { requiresAI: true, commandName: 'ct recover' }));

program
  .command('git')
  .description('Git integration — status, diff, commit suggestions, review, PR')
  .argument('[subcommand]', 'status|diff|suggest|review|pr|branch')
  .argument('[args...]', 'additional arguments')
  .action((subcommand?: string, extras?: string[]) => runHandler(() => gitCommand(subcommand || '', ...(extras || []))));

program
  .command('test')
  .description('Test agent — generate tests, analyze coverage, mutation testing')
  .argument('[subcommand]', 'status|generate|generate-all|coverage|mutate')
  .argument('[args...]', 'file path or directory')
  .action((subcommand?: string, extras?: string[]) => runHandler(() => testGenCommand(subcommand || '', ...(extras || []))));

program
  .command('profile')
  .description('Profile project — detect N+1 queries, memory leaks, bundle size, code smells')
  .action(() => runHandler(() => profileCommand()));

program
  .command('memory')
  .description('Explore, search, and manage persistent project memory')
  .argument('[args...]', 'search query or subcommand')
  .action((args: string[]) => runHandler(() => memoryCommand(...(args || []))));

program
  .command('analytics')
  .description('Show autonomous execution analytics and reliability metrics')
  .action(() => runHandler(() => analyticsCommand()));

program
  .command('graph')
  .description('Visualize repository architecture, routes, services, data, and dependencies')
  .argument('[directory]', 'repository directory')
  .action((dir?: string) => runHandler(() => graphCommand(dir)));

program
  .command('checkpoint')
  .description('Recovery points — save and restore project state snapshots')
  .argument('[subcommand]', 'list|save|restore')
  .argument('[args...]', 'description or restore ID')
  .action((subcommand?: string, extras?: string[]) => runHandler(() => checkpointCommand(subcommand || '', ...(extras || []))));

program
  .command('inspect')
  .description('Inspect the latest or selected execution journal')
  .argument('[runId]', 'execution run id')
  .action((runId?: string) => runHandler(() => inspectCommand(runId)));

program
  .command('sessions')
  .description('Show the execution session dashboard')
  .action(() => runHandler(() => inspectCommand()));

program
  .command('replay')
  .description('Replay the latest or selected execution journal event timeline')
  .argument('[runId]', 'execution run id')
  .action((runId?: string) => runHandler(() => replayCommand(runId)));

program
  .command('onboard')
  .description('First-time setup wizard — configure API keys and provider')
  .option('-r, --reset', 'Reset configuration and re-run setup')
  .action((opts?: { reset?: boolean }) => runHandler(() => onboardCommand(opts?.reset)));

// Auth command family
const auth = program
  .command('auth')
  .description('Manage provider authentication and configuration')
  .action(() => runHandler(() => authListCommand()));

auth
  .command('add')
  .description('Add and validate a new provider')
  .action(() => runHandler(() => authAddCommand()));

auth
  .command('list')
  .description('List configured providers')
  .action(() => runHandler(() => authListCommand()));

auth
  .command('test')
  .description('Test provider credentials')
  .argument('[provider]', 'provider name (e.g. openai, nvidia, groq)')
  .action((provider?: string) => runHandler(() => authTestCommand(provider)));

auth
  .command('switch')
  .description('Switch active provider')
  .action(() => runHandler(() => authSwitchCommand()));

auth
  .command('remove')
  .description('Remove provider credentials')
  .argument('[provider]', 'provider name')
  .action((provider?: string) => runHandler(() => authRemoveCommand(provider)));

auth
  .command('logout')
  .description('Remove all credentials and reset configuration')
  .action(() => runHandler(() => authLogoutCommand()));

// Override unknown command behavior
program.exitOverride();

(async () => {
  try {
    const { hydrateKnownSecrets } = await import('./utils/keychain');
    await hydrateKnownSecrets();
  } catch {
    // Secret hydration is best-effort.
  }

  theme.setMode(getThemeMode());

  const { showSplash, showMiniSplash } = await import('./utils/splash');
  const firstArg = process.argv[2];
  const hasCommandValue = process.argv.slice(3).some(arg => !arg.startsWith('-'));
  const llm = getLLMConfig();
  const providerCheck = validateProviderConfig();

  // Launch REPL if no command
  if (process.argv.length < 3) {
    process.stdout.write(showSplash());
    if (!providerCheck.ok) {
      printHero(
        'Setup required',
        'No working AI provider is configured yet. CodeThon will guide you through setup before opening the OLED workspace.',
        'setup',
        'First-run setup',
      );
    }

    if (!providerCheck.ok && process.stdout.isTTY && process.stdin.isTTY) {
      const setupResult = await onboardCommand(false);
      if (!setupResult.success) {
        console.log('');
        logger.warn('Continuing into the REPL with setup still incomplete.');
      }
    }

    const { replCommand } = await import('./commands/repl');
    const ask = program.getOptionValue('ask') as boolean;
    const dryRun = program.getOptionValue('dryRun') as boolean;
    await replCommand(ask, dryRun);
    return;
  }

  // Show help
  if (firstArg === '--help' || firstArg === '-h' || firstArg === 'help' || firstArg === 'commands' || firstArg === '?') {
    process.stdout.write(showSplash());
    const { showCategorizedHelp } = await import('./utils/help');
    showCategorizedHelp();
    return;
  }

  // Show mini splash for main commands
  if ((firstArg === 'execute' && !hasCommandValue) || (firstArg === 'run' && !hasCommandValue)) {
    // Let Commander print the usage error directly. A "Running..." banner before a missing-arg
    // error makes the CLI feel broken.
  } else if (firstArg === 'execute' || firstArg === 'build' || firstArg === 'plan' || firstArg === 'init' || firstArg === 'model') {
    process.stdout.write(showMiniSplash());
    if (firstArg !== 'init') {
      printHero(
        `Running ct ${firstArg}`,
        providerCheck.ok
          ? `Using ${llm.provider} · ${llm.model || 'no model selected'}`
          : 'AI setup is still incomplete.',
        providerCheck.ok ? 'ready' : 'warning',
        providerCheck.ok ? 'Ready' : 'Check setup',
      );
    }
  }

  // Unknown commands — show error, not NL fallback
  if (firstArg && !firstArg.startsWith('-')) {
    const allSubs: string[] = [];
    for (const c of program.commands) {
      allSubs.push(c.name());
      if (c.commands) c.commands.forEach((s: any) => allSubs.push(`${c.name()} ${s.name()}`));
    }
    const isKnown = allSubs.includes(firstArg) || allSubs.includes(`${firstArg} add`);
    const isAuthSub = firstArg === 'auth';

    if (!isKnown && !isAuthSub) {
      console.log('');
      logger.error(`Unknown command: ${chalk.hex('#f7fff9').bold(firstArg)}${process.argv.slice(3).length > 0 ? ' ' + process.argv.slice(3).join(' ') : ''}`);
      console.log('');
      logger.info(chalk.hex('#899691')('Did you mean:'));
      const suggestions = findScopedCommandSuggestions(firstArg, 'cli')
        .slice(0, 5);
      for (const s of suggestions) {
        logger.info(`  ${chalk.hex('#74d7ff')(formatCliUsage(s))} ${chalk.hex('#899691')(s.description)}`);
      }
      if (suggestions.length === 0) {
        logger.info(`  ${chalk.hex('#74d7ff')('ct help')}`);
        logger.info(`  ${chalk.hex('#74d7ff')('ct auth add')}`);
        logger.info(`  ${chalk.hex('#74d7ff')('ct init')}`);
        logger.info(`  ${chalk.hex('#74d7ff')('ct plan')}`);
        logger.info(`  ${chalk.hex('#74d7ff')('ct execute "<goal>"')}`);
      }
      console.log('');
      logger.info(chalk.hex('#899691')('Run') + ` ${chalk.hex('#74d7ff')('ct help')} ${chalk.hex('#899691')('to see all commands.')}`);
      process.exitCode = 1;
      return;
    }
  }

  // Parse normally
  try {
    program.parse(process.argv);
  } catch (e: any) {
    if (e.code === 'commander.unknownCommand') {
      logger.error(`Unknown command. Run ${chalk.hex('#74d7ff')('ct help')} to see available commands.`);
      process.exitCode = 1;
    } else if (e.exitCode === 0) {
      process.exit(0);
    } else {
      logger.error(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
      process.exitCode = 1;
    }
  }
})();
