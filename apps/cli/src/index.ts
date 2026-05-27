#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import chalk from 'chalk';

import {
  initCommand,
  modelCommand,
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
  diffCommand,
  clearCommand,
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
} from './commands';
import { logger, showStartupTips } from './utils';


dotenv.config();

process.on('SIGTERM', () => process.exit(0));

const program = new Command();

program
  .name('ct')
  .description('CodeThon CLI — AI-native execution orchestration for hackathons')
  .version('0.1.0')
  .option('-d, --debug', 'enable verbose debug output')
  .option('-o, --output <format>', 'output format (text|json)', 'text')
  .option('-a, --ask', 'require approval before running commands or modifying files');

program
  .command('init')
  .description('Initialize a new CodeThon project')
  .action(async () => {
    try {
      const result = await initCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('model')
  .description('Switch the AI model powering CodeThon agents')
  .action(async () => {
    try {
      const result = await modelCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('roadmap')
  .description('Generate project roadmap and milestones')
  .action(async () => {
    try {
      const result = await roadmapCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('architect')
  .description('Design architecture and stack recommendations')
  .action(async () => {
    try {
      const result = await architectCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('scaffold')
  .description('Scaffold a starter project')
  .argument('[directory]', 'target directory')
  .action(async (dir?: string) => {
    try {
      const result = await scaffoldCommand(dir);
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('debug')
  .description('Analyze errors and get fixes')
  .action(async () => {
    try {
      const result = await debugCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('emergency')
  .description('Emergency recovery for last-minute crashes')
  .action(async () => {
    try {
      const result = await emergencyCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('deploy')
  .description('Get deployment guidance')
  .action(async () => {
    try {
      const result = await deployCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('readme')
  .description('Generate README for your project')
  .action(async () => {
    try {
      const result = await readmeCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('launch')
  .description('Generate launch assets (posts, demo, submission)')
  .action(async () => {
    try {
      const result = await launchCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('startup')
  .description('Analyze startup potential and generate business strategy')
  .action(async () => {
    try {
      const result = await startupCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('learn')
  .description('Ask a question and get a guided tutorial')
  .action(async () => {
    try {
      const result = await learnCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show current session configuration and project status')
  .action(async () => {
    try {
      await statusCommand();
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

program
  .command('review')
  .description('Review current changes and find issues')
  .alias('diff')
  .action(async () => {
    try {
      await reviewCommand();
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

program
  .command('clear')
  .description('Clear the terminal')
  .action(async () => {
    await clearCommand();
  });

program
  .command('analyze')
  .description('Scan project structure, detect issues, generate summary')
  .argument('[directory]', 'target directory (default: auto-detect project)')
  .action(async (dir?: string) => {
    try {
      const result = await analyzeCommand(dir);
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('build')
  .description('Autonomous build agent — generates code, writes files, fixes errors')
  .argument('[goal]', 'build goal (e.g. "add auth" or "fix the login page")')
  .action(async (goal?: string) => {
    try {
      const result = await buildCommand(goal);
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('autofix')
  .description('Auto-detect build errors and fix them in project files')
  .action(async () => {
    try {
      const result = await autofixCommand();
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('execute')
  .description('Autonomous execution agent — loops, plans, researches, builds, fixes until goal is met')
  .argument('<goal>', 'what to build or accomplish')
  .action(async (goal: string) => {
    try {
      const result = await executeCommand(goal);
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('run')
  .description('Run a command with live terminal output')
  .argument('[cmd...]', 'command to execute')
  .action(async (cmd: string[]) => {
    try {
      const askMode = program.getOptionValue('ask') as boolean;
      const result = await runCommand(cmd, askMode);
      if (program.getOptionValue('output') === 'json') {
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('doctor')
  .description('Run project diagnostics — checks Node, deps, env, config, TypeScript')
  .action(async () => {
    try {
      const result = await doctorCommand();
      if (program.getOptionValue('output') === 'json') console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('explain')
  .description('Analyze and explain any file in the project')
  .argument('<file>', 'path to the file to explain')
  .action(async (file: string) => {
    try {
      const result = await explainCommand(file);
      if (program.getOptionValue('output') === 'json') console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('summarize')
  .description('Generate a structured project status summary')
  .action(async () => {
    try {
      const result = await summarizeCommand();
      if (program.getOptionValue('output') === 'json') console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

program
  .command('recover')
  .description('Scan repo, rebuild context, restore execution awareness')
  .action(async () => {
    try {
      const result = await recoverCommand();
      if (program.getOptionValue('output') === 'json') console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

(async () => {
  // Launch REPL if no command
  if (process.argv.length < 3) {
    const { replCommand } = await import('./commands/repl');
    await replCommand();
    return;
  }

  // Natural language fallback — check before Commander parses
  const knownCommands = program.commands.map(c => c.name());
  const firstArg = process.argv[2];
  const isKnown = knownCommands.includes(firstArg || '');

  if (firstArg && !isKnown && !firstArg.startsWith('-')) {
    await naturalLanguageCommand(process.argv.slice(2).join(' '));
  } else {
    program.exitOverride();
    try {
      program.parse(process.argv);
    } catch (e: any) {
      if (e.code === 'commander.unknownCommand') {
        const rawArgs = process.argv.slice(2).join(' ');
        if (rawArgs.trim()) {
          await naturalLanguageCommand(rawArgs);
        } else {
          showStartupTips();
        }
      } else {
        logger.error(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
        process.exit(1);
      }
    }
  }
})();
