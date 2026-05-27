import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { BuildEngine } from '../cil/build-engine';
import { StateManager } from '../cil/state-manager';
import { logger } from '../utils';
import { renderAgentOutput } from '../utils/render';

export async function buildCommand(goal?: string): Promise<CommandResult> {
  logger.section('CodeThon CLI — Autonomous Builder');

  const state = new StateManager();
  const project = state.getProject();

  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  const buildGoal = goal || project.idea || 'Build a complete working application';
  const engine = new BuildEngine(process.cwd());

  try {
    // Step 1: Analyze
    logger.info(`${chalk.cyanBright('\u25B8')} Step 1/3: Analyzing current project state...\n`);
    const analysis = await engine.analyzeProject();
    logger.info(`  ${chalk.greenBright('\u2713')} ${analysis.techStack.join(', ') || 'Mixed'} project, ${analysis.structure.length} files found\n`);

    // Step 2: Generate & execute build plan with streaming
    logger.info(`${chalk.cyanBright('\u25B8')} Step 2/3: Generating build plan for: ${chalk.bold.whiteBright(buildGoal)}\n`);

    const result = await engine.build(buildGoal, (token) => {
      process.stdout.write(token);
    });

    process.stdout.write('\n');

    // Step 3: Auto-fix
    if (result.errors.length > 0) {
      logger.info(`${chalk.cyanBright('\u25B8')} Step 3/3: Auto-fixing ${result.errors.length} issues...\n`);
      const fixResult = await engine.autoFix((token) => {
        process.stdout.write(token);
      });
      process.stdout.write('\n');
      logger.info(`  ${chalk.greenBright('\u2713')} Fixed ${fixResult.filesFixed} files\n`);
    } else {
      logger.info(`${chalk.cyanBright('\u25B8')} Step 3/3: No issues to fix\n`);
    }

    // Summary
    logger.resultSummary('Build Complete', [
      `${chalk.greenBright('Files created/modified')}: ${result.filesWritten}`,
      `${chalk.cyanBright('Commands executed')}: ${result.commandsRun}`,
      `${result.errors.length > 0 ? chalk.redBright('Errors') : chalk.greenBright('Errors')}: ${result.errors.length}`,
    ]);

    state.updateProject({ outputs: [...(project.outputs || []), `Autonomous build: ${buildGoal}`] });

    return {
      success: result.errors.length === 0,
      message: result.errors.length === 0 ? 'Build complete' : 'Build completed with errors',
      data: { goal: buildGoal, result },
    };
  } catch (error) {
    logger.error(`Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Build failed' };
  }
}
