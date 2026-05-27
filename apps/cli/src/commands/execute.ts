import chalk from 'chalk';
import type { CommandResult } from '@codethon/shared-types';
import { JobLoop } from '../cil/job-loop';
import type { JobStatus } from '../cil/job-loop';
import type { ToolCall, ToolResult } from '../cil/tools';
import { getLLMConfig } from '../utils/config';
import { renderAgentOutput } from '../utils/render';

const ACCENT = '#7C3AED';
const GOLD = '#F59E0B';

const HUMAN_TOOL: Record<string, string> = {
  read_file: 'read file',
  write_file: 'wrote file',
  run_command: 'ran command',
  list_directory: 'browsed',
  search_files: 'searched',
  grep_search: 'grepped',
  web_search: 'searched web',
  crawl_url: 'fetched url',
};

function fmtTime(seconds?: number): string {
  if (seconds == null) return '';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export async function executeCommand(goal: string): Promise<CommandResult> {
  if (!goal) {
    process.stderr.write(chalk.red('\u2605 Error: No goal specified. Usage: ct execute "<goal>"\n'));
    return { success: false, message: 'No goal specified' };
  }

  const config = getLLMConfig();
  const modelLabel = config.model?.split('/').pop() || config.model || 'unknown';
  const maxIterations = 40;
  const loop = new JobLoop(process.cwd(), maxIterations);
  const errors: string[] = [];
  let dotInterval: ReturnType<typeof setInterval> | null = null;

  process.stdout.write(
    `\n  ${chalk.hex(ACCENT)('\u2605')}  ${chalk.bold('CodeThon Execute')}\n` +
    `  ${chalk.dim(`${modelLabel}  |  max ${maxIterations} iterations`)}\n` +
    `  ${chalk.hex(ACCENT)('\u2500'.repeat(52))}\n\n`
  );

  const result = await loop.execute(goal, handleStatus, handleToken);

  clearThinking();
  const totalTime = fmtTime(result.elapsed);
  process.stdout.write(
    `\n  ${chalk.hex(ACCENT)('\u2501'.repeat(52))}\n` +
    `  ${result.success ? chalk.green('\u2605') : chalk.yellow('\u2605')}  ${chalk.bold('Complete')} \u2014 ${result.success ? chalk.bold.green('Goal Met') : chalk.bold.yellow('Max Iterations')}\n` +
    `  ${chalk.hex(ACCENT)('\u2501'.repeat(52))}\n` +
    `  ${chalk.dim('\u2502')}  ${chalk.bold('iterations')}: ${chalk.cyan(String(result.iterations))}\n` +
    `  ${chalk.dim('\u2502')}  ${chalk.bold('total time')}: ${chalk.cyan(totalTime)}\n` +
    `  ${chalk.dim('\u2502')}  ${chalk.bold('errors')}: ${errors.length ? chalk.red(errors.join('; ')) : chalk.green('none')}\n`
  );

  if (result.summary) { process.stdout.write('\n'); renderAgentOutput(result.summary); }
  process.stdout.write('\n');

  return { success: result.success, message: result.summary, data: result };

  function handleStatus(status: JobStatus) {
    if (status.phase === 'plan' && !status.done) {
      clearThinking();
      const elapsed = status.totalElapsed != null ? chalk.dim(` [${fmtTime(status.totalElapsed)}]`) : '';
      process.stdout.write(
        `  ${chalk.hex(ACCENT)('\u2500'.repeat(52))}\n` +
        `  ${chalk.bold.hex('#A78BFA')('\u2605  Iteration ' + (status.iteration + 1) + '/' + maxIterations)}${elapsed}\n` +
        `  ${chalk.hex(ACCENT)('\u2500'.repeat(52))}\n\n`
      );
    } else if (status.phase === 'tool_call' && status.toolCall) {
      clearThinking();
      showToolCall(status.toolCall);
    } else if (status.phase === 'tool_result' && status.toolResult) {
      showToolResult(status.toolResult);
    } else if (status.phase === 'done') {
      clearThinking();
      if (status.error) errors.push(status.error);
    }
  }

  function startThinking() {
    if (dotInterval) return;
    process.stdout.write(`  ${chalk.hex(ACCENT)('\u25CB')}  ${chalk.dim('Thinking')}`);
    let n = 0;
    dotInterval = setInterval(() => {
      n = (n + 1) % 4;
      process.stdout.write(`\r  ${chalk.hex(ACCENT)('\u25CB')}  ${chalk.dim('Thinking' + '.'.repeat(n))}${' '.repeat(3 - n)}`);
    }, 400);
  }

  function clearThinking() {
    if (dotInterval) {
      clearInterval(dotInterval);
      dotInterval = null;
      process.stdout.write(`\r  ${chalk.hex(ACCENT)('\u25CB')}  ${chalk.dim('Thinking')}\n`);
    }
  }

  function handleToken(_token: string) {
    if (!dotInterval) startThinking();
  }

  function showToolCall(call: ToolCall) {
    const label = HUMAN_TOOL[call.tool] || call.tool;
    process.stdout.write(`  ${chalk.hex(GOLD)('\u25B6')}  ${chalk.bold(label)}\n`);
    const a = call.args;
    if (a.path)      process.stdout.write(`        path: ${chalk.cyan(a.path)}\n`);
    if (a.pattern)   process.stdout.write(`        pattern: ${chalk.magenta(a.pattern)}\n`);
    if (a.query)     process.stdout.write(`        query: ${chalk.white(a.query)}\n`);
    if (a.url)       process.stdout.write(`        url: ${chalk.cyan(a.url)}\n`);
    if (a.command)   process.stdout.write(`        cmd: ${chalk.yellow(a.command)}\n`);
    if (a.content !== undefined) process.stdout.write(`        size: ${chalk.white(`${a.content.length} chars`)}\n`);
    if (a.description) process.stdout.write(`        for: ${chalk.white(a.description)}\n`);
    if (a.include)   process.stdout.write(`        include: ${chalk.white(a.include)}\n`);
    if (a.depth)     process.stdout.write(`        depth: ${chalk.white(String(a.depth))}\n`);
    process.stdout.write('\n');
  }

  function showToolResult(result: ToolResult) {
    const label = HUMAN_TOOL[result.tool] || result.tool;
    const timeTag = result.elapsed != null ? chalk.dim(` [${fmtTime(result.elapsed)}]`) : '';
    const mark = result.error ? chalk.red('\u25CB') : chalk.green('\u25CF');
    const tag = result.error ? chalk.bold.red(label) : chalk.bold.green(label);
    process.stdout.write(`  ${mark}  ${tag}${timeTag}\n`);

    if (result.error) {
      process.stdout.write(`        ${chalk.red(result.error)}\n\n`);
      return;
    }

    if (result.tool === 'read_file') {
      const lines = result.output.split('\n').length;
      process.stdout.write(`        ${chalk.dim(`${lines} lines`)}\n\n`);
      return;
    }

    if (result.tool === 'list_directory') {
      const lines = result.output.split('\n');
      for (const line of lines.slice(0, 10)) {
        process.stdout.write(`        ${chalk.dim(line)}\n`);
      }
      if (lines.length > 10) process.stdout.write(chalk.dim(`        ... (${lines.length} lines)\n`));
      process.stdout.write('\n');
      return;
    }

    if (result.tool === 'run_command') {
      const lines = result.output.split('\n');
      const termWidth = 54;
      process.stdout.write(`  ${chalk.hex(ACCENT)('\u250C' + '\u2500'.repeat(termWidth - 2) + '\u2510')}\n`);
      const displayLines = lines.slice(0, 100);
      for (const line of displayLines) {
        const truncated = line.length > termWidth - 4 ? line.slice(0, termWidth - 7) + '...' : line;
        process.stdout.write(`  ${chalk.hex(ACCENT)('\u2502')} ${chalk.dim(truncated)}${' '.repeat(Math.max(0, termWidth - 4 - truncated.length))}${chalk.hex(ACCENT)('\u2502')}\n`);
      }
      if (lines.length > 100) {
        process.stdout.write(`  ${chalk.hex(ACCENT)('\u2502')} ${chalk.dim(`... (${lines.length - 100} more lines)`)}${' '.repeat(Math.max(0, termWidth - 29))}${chalk.hex(ACCENT)('\u2502')}\n`);
      }
      process.stdout.write(`  ${chalk.hex(ACCENT)('\u2514' + '\u2500'.repeat(termWidth - 2) + '\u2518')}\n\n`);
      return;
    }

    const lines = result.output.split('\n');
    for (const line of lines.slice(0, 5)) {
      process.stdout.write(`        ${chalk.dim(line)}\n`);
    }
    if (lines.length > 5) process.stdout.write(chalk.dim(`        ... (${lines.length} lines)\n`));
    process.stdout.write('\n');
  }
}
