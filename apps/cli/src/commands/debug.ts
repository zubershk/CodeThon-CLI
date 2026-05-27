import inquirer from 'inquirer';
import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { DebugAgent } from '../agents/debug-agent';
import { StateManager } from '../cil/state-manager';
import { HealthScoreCalculator } from '../cil/health-score';
import { createSpinner, logger } from '../utils';
import { parseBuildErrors, formatParsedErrors, generateFixSuggestions } from '../utils/error-parser';
import { requireApproval } from '../utils/approval';
import { TerminalPreview, renderTerminalBox, renderTerminalLine, renderTerminalClose } from '../utils/terminal-preview';
import { renderAgentOutput } from '../utils/render';

export async function debugCommand(errorInput?: string): Promise<CommandResult> {
  logger.section('CodeThon CLI — Debug Assistant');

  const state = new StateManager();
  const project = state.getProject();

  // If no direct error input, try to collect build output automatically
  let errorText = errorInput || '';
  if (!errorText) {
    // Auto-collect build errors
    const preview = new TerminalPreview();
    renderTerminalBox('Auto-collecting build errors...');
    const buildResult = await preview.run('npm run build 2>&1', process.cwd(), (line) => {
      renderTerminalLine(line, 'stdout');
    }, 60000);
    renderTerminalClose(buildResult);
    errorText = buildResult.stdout + '\n' + buildResult.stderr;
  }

  // Parse errors
  const parsedErrors = parseBuildErrors(errorText);
  const suggestions = generateFixSuggestions(parsedErrors);

  if (parsedErrors.length > 0) {
    logger.subsection('Parsed Errors');
    console.log(formatParsedErrors(parsedErrors));
    console.log('');

    if (suggestions.length > 0) {
      logger.subsection('Suggested Fixes');
      for (const s of suggestions) {
        const isCmd = s.startsWith('ct ') || s.startsWith('npm ') || s.startsWith('npx ');
        if (isCmd) {
          logger.commandBlock(s);
        } else {
          logger.bullet(s);
        }
      }
      console.log('');
    }
  }

  // Ask user for additional error context
  const { extraContext } = await inquirer.prompt([
    {
      type: 'input',
      name: 'extraContext',
      message: 'Additional error context or the specific error message:',
      default: parsedErrors.length > 0 ? parsedErrors[0].message : errorText.slice(0, 200),
    },
  ]);

  const agent = new DebugAgent();
  agent.setProjectRoot(process.cwd());
  const spinner = createSpinner(chalk.yellow('Analyzing error with AI...'));
  spinner.start();

  try {
    const analysisContext = [
      `Error: ${extraContext}`,
      parsedErrors.length > 0 ? `Parsed ${parsedErrors.length} errors:\n${parsedErrors.map(e => `- ${e.file}:${e.line}:${e.col} ${e.message}`).join('\n')}` : '',
      `Auto-suggestions: ${suggestions.join('; ')}`,
      `Full build output:\n\`\`\`\n${errorText.slice(0, 3000)}\n\`\`\``,
    ].filter(Boolean).join('\n\n');

    const output = await agent.run(analysisContext);

    spinner.succeed('Analysis complete');
    console.log('');
    renderAgentOutput(output.details);
    console.log('');

    // Offer to auto-fix via tool calling
    if (parsedErrors.length > 0) {
      const { wantFix } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'wantFix',
          message: 'Attempt to auto-fix these errors?',
          default: true,
        },
      ]);

      if (wantFix) {
        logger.info('');
        logger.info(`${chalk.cyanBright('\u25B8')} Running auto-fix...\n`);

        const engine = new (await import('../cil/build-engine')).BuildEngine(process.cwd());
        const fixResult = await engine.autoFix((token) => {
          process.stdout.write(token);
        });

        console.log('');
        if (fixResult.filesFixed > 0) {
          logger.resultSummary('Auto-Fix Applied', [
            `${chalk.greenBright('Files fixed')}: ${fixResult.filesFixed}`,
          ]);
        }
      }
    }

    state.updateProject({ sprintPhase: 'debugging' });

    const health = new HealthScoreCalculator();
    const score = health.calculate();
    logger.bullet(`Health Score: ${score.overall}/100`);

    return {
      success: true,
      message: 'Debug analysis complete',
      data: { analysis: output.details, parsedErrors, suggestions },
    };
  } catch (error) {
    spinner.fail('Failed to analyze error');
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Failed to analyze error' };
  }
}
