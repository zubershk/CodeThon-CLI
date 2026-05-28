import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { BuildEngine } from '../cil/build-engine';
import { StateManager } from '../cil/state-manager';
import { logger } from '../utils';
import { startAgent, succeedAgent, failAgent } from '../utils/agent-feed';

export async function buildCommand(goal?: string, askMode = false, dryRun = false): Promise<CommandResult> {
  logger.section('CodeThon CLI — Autonomous Builder');

  const state = new StateManager();
  const project = state.getProject();

  if (!project) {
    logger.error('No active project. Run `ct init` first.');
    return { success: false, message: 'No active project' };
  }

  const buildGoal = goal || project.idea || 'Build a complete working application';
  const engine = new BuildEngine(process.cwd(), askMode, dryRun);

  try {
    // Step 1: Analyze
    startAgent('Architect', `Analyzing project structure...`);
    const analysis = await engine.analyzeProject();
    succeedAgent(`${analysis.techStack.join(', ') || 'Mixed'} project, ${analysis.structure.length} files`);

    console.log('');

    // Step 2: Generate & execute build plan with streaming
    startAgent('Build', `Generating build plan for: ${buildGoal}`);
    const result = await engine.build(buildGoal, () => {});
    succeedAgent(`${result.filesWritten} files written, ${result.commandsRun} commands executed`);

    // Step 3: Auto-fix
    if (result.errors.length > 0) {
      startAgent('Debug', `Auto-fixing ${result.errors.length} issues...`);
      const fixResult = await engine.autoFix(() => {});
      succeedAgent(`Fixed ${fixResult.filesFixed} files`);
    } else {
      succeedAgent('No issues to fix');
    }

    console.log('');

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
    failAgent(error instanceof Error ? error.message : 'Build failed');
    logger.error(`Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Build failed' };
  }
}
