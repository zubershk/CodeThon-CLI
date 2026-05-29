import type { CommandResult } from '@codethon/shared-types';
import { JobLoop } from '../cil/job-loop';
import type { JobStatus } from '../cil/job-loop';
import type { ToolCall, ToolResult } from '../cil/tools';
import { getLLMConfig } from '../utils/config';
import { renderAgentOutput } from '../utils/render';
import { showSplash } from '../utils/splash';
import { TerminalRenderer } from '../ui/terminal-renderer';
import { animations } from '../ui/animations';
import { AgentVisualizer } from '../ui/agent-visualizer';
import { StreamingRenderer } from '../ui/streaming-renderer';
import { theme } from '../ui/theme';

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

const HEADER_H = 3;
const AGENT_Y = 3;
const TOOL_Y = 8;
const RESULT_Y = 15;
const BOX_W = 56;

function fmtTime(seconds?: number): string {
  if (seconds == null) return '';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export async function executeCommand(goal: string, askMode = false, dryRun = false): Promise<CommandResult> {
  if (!goal) {
    process.stderr.write(`${theme.style('\u2605 Error: No goal specified.', 'error')} Usage: ct execute "<goal>"\n`);
    return { success: false, message: 'No goal specified' };
  }

  const config = getLLMConfig();
  const modelLabel = config.model?.split('/').pop() || config.model || 'unknown';
  const maxIterations = 40;
  const loop = new JobLoop(process.cwd(), maxIterations, askMode, dryRun);
  const errors: string[] = [];

  const renderer = new TerminalRenderer();
  const visualizer = new AgentVisualizer(renderer, 2, AGENT_Y, BOX_W - 4);
  const streamer = new StreamingRenderer();

  const quotes = [
    '"Code is poetry written in logic."',
    '"Build things that matter."',
    '"First make it work, then make it fast."',
    '"Done is better than perfect."',
    '"Push yourself \u2014 no one else will."',
    '"The best time to start was yesterday."',
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  // ── Header ──────────────────────────────────────────────────────
  renderer.drawBox(0, 0, { width: BOX_W, height: HEADER_H, title: ` ${theme.style('\u2605', 'success')} Execute `, color: 'primary', borderStyle: 'double' });
  renderer.writeText(2, 1, theme.style(modelLabel, 'textDim') + theme.dim() + `  |  max ${maxIterations} iterations` + theme.reset());
  renderer.writeText(2, 2, theme.style(quote, 'textDim'));

  // ── Agent visualizer initial state ──────────────────────────────
  visualizer.updateAgent('main', {
    name: 'CodeThon Agent',
    icon: '\u2699',
    status: 'idle',
    currentTask: 'Ready',
    progress: 0,
  });
  visualizer.render();
  renderer.flush();

  // ── Run the autonomous agent loop ───────────────────────────────
  const result = await loop.execute(goal, handleStatus, handleToken);

  // ── Show completion ─────────────────────────────────────────────
  const totalTime = fmtTime(result.elapsed);
  const resultH = result.success ? 5 : 6;
  const resultY = 4;
  const explosion = result.success ? ` ${animations.successExplosion()}` : '';
  renderer.clear();

  renderer.drawBox(0, 0, { width: BOX_W, height: HEADER_H, title: ` ${theme.style('\u2605', 'success')} Execute `, color: 'primary', borderStyle: 'double' });
  renderer.writeText(2, 1, theme.style(modelLabel, 'textDim') + theme.dim() + `  |  max ${maxIterations} iterations` + theme.reset());
  renderer.writeText(2, 2, theme.style(quote, 'textDim'));

  renderer.drawBox(0, resultY, {
    width: BOX_W, height: resultH,
    title: ` ${result.success ? theme.style('\u2605', 'success') : theme.style('\u2605', 'warning')} ${result.success ? 'Complete \u2014 Goal Met' : 'Complete \u2014 Max Iterations'} `,
    color: result.success ? 'success' : 'warning', borderStyle: 'double',
  });
  renderer.writeText(2, resultY + 1, `  ${theme.bold()}iterations:${theme.reset()} ${theme.style(String(result.iterations), 'primary')}`);
  renderer.writeText(2, resultY + 2, `  ${theme.bold()}total time:${theme.reset()} ${theme.style(totalTime, 'primary')}`);
  renderer.writeText(2, resultY + 3, `  ${theme.bold()}errors:${theme.reset()} ${errors.length ? theme.style(errors.join('; '), 'error') : theme.style('none', 'success')}`);
  renderer.flush();
  if (explosion) process.stdout.write(explosion + '\n');

  if (result.summary) {
    process.stdout.write('\n');
    renderAgentOutput(result.summary);
  }
  process.stdout.write('\n');

  return { success: result.success, message: result.summary, data: result as unknown as Record<string, unknown> };

  // ── Status handler — called on each phase change ────────────────
  function handleStatus(status: JobStatus) {
    if (status.phase === 'plan' && !status.done) {
      const elapsed = status.totalElapsed != null ? ` [${fmtTime(status.totalElapsed)}]` : '';
      const progress = status.iteration / maxIterations;
      const wave = animations.executionWave(progress);
      visualizer.updateAgent('main', {
        name: 'CodeThon Agent',
        icon: '\u2699',
        status: 'thinking',
        currentTask: `Iteration ${status.iteration + 1}/${maxIterations}`,
        progress,
        elapsedMs: status.totalElapsed ? status.totalElapsed * 1000 : undefined,
        details: [wave],
      });
      visualizer.render();
      renderer.flush();
    } else if (status.phase === 'tool_call' && status.toolCall) {
      visualizer.updateAgent('main', {
        name: 'CodeThon Agent',
        icon: '\u2699',
        status: 'working',
        currentTask: `Running ${HUMAN_TOOL[status.toolCall.tool] || status.toolCall.tool}...`,
        elapsedMs: status.totalElapsed ? status.totalElapsed * 1000 : undefined,
      });
      visualizer.render();
      showToolCall(status.toolCall);
    } else if (status.phase === 'tool_result' && status.toolResult) {
      visualizer.updateAgent('main', {
        name: 'CodeThon Agent',
        icon: '\u2699',
        status: 'working',
        currentTask: `Processed ${HUMAN_TOOL[status.toolResult.tool] || status.toolResult.tool}`,
        elapsedMs: status.totalElapsed ? status.totalElapsed * 1000 : undefined,
      });
      visualizer.render();
      showToolResult(status.toolResult);
    } else if (status.phase === 'done') {
      const ok = !status.error;
      visualizer.updateAgent('main', {
        name: 'CodeThon Agent',
        icon: ok ? '\u2713' : '\u2717',
        status: ok ? 'done' : 'error',
        currentTask: ok ? 'Goal met!' : status.description || 'Failed',
        progress: 1,
      });
      visualizer.render();
      renderer.flush();
      if (status.error) errors.push(status.error);
    }
  }

  // ── Token handler — called on each streaming token ──────────────
  function handleToken(token: string) {
    const highlighted = streamer.appendWithCursor(token);
    process.stdout.write(`\r${highlighted}`);
  }

  // ── Tool call box ───────────────────────────────────────────────
  function showToolCall(call: ToolCall) {
    const label = HUMAN_TOOL[call.tool] || call.tool;
    renderer.drawBox(0, TOOL_Y, { width: BOX_W, height: 7, title: ` ${theme.style('\u25B6', 'warning')} ${theme.bold()}${label}${theme.reset()} `, color: 'warning', borderStyle: 'rounded' });
    const a = call.args;
    let line = TOOL_Y + 1;
    if (a.path) { renderer.writeText(2, line, `path: ${a.path}`, { fg: theme.colors.primary }); line++; }
    if (a.pattern) { renderer.writeText(2, line, `pattern: ${a.pattern}`, { fg: theme.colors.textBright }); line++; }
    if (a.query) { renderer.writeText(2, line, `query: ${a.query}`, { fg: theme.colors.text }); line++; }
    if (a.url) { renderer.writeText(2, line, `url: ${a.url}`, { fg: theme.colors.primary }); line++; }
    if (a.command) { renderer.writeText(2, line, `cmd: ${a.command}`, { fg: theme.colors.warning }); line++; }
    if (a.content !== undefined) { renderer.writeText(2, line, `size: ${a.content.length} chars`, { fg: theme.colors.text }); line++; }
    if (a.description) { renderer.writeText(2, line, `for: ${a.description}`, { fg: theme.colors.text }); line++; }
    if (a.include) { renderer.writeText(2, line, `include: ${a.include}`, { fg: theme.colors.text }); line++; }
    if (a.depth) { renderer.writeText(2, line, `depth: ${String(a.depth)}`, { fg: theme.colors.text }); line++; }
    renderer.flush();
  }

  // ── Tool result display ─────────────────────────────────────────
  function showToolResult(toolResult: ToolResult) {
    const label = HUMAN_TOOL[toolResult.tool] || toolResult.tool;
    const timeTag = toolResult.elapsed != null ? ` [${fmtTime(toolResult.elapsed)}]` : '';
    const color = toolResult.error ? 'error' : 'success';
    const mark = toolResult.error ? '\u25CB' : '\u25CF';

    renderer.writeText(2, RESULT_Y, `${mark}  ${label}${timeTag}`, { fg: theme.colors[color], bold: true });
    renderer.flush();

    if (toolResult.error) {
      process.stdout.write(`\n${theme.style(toolResult.error, 'error')}\n`);
      return;
    }

    if (toolResult.tool === 'run_command') {
      const lines = toolResult.output.split('\n');
      const termWidth = BOX_W - 2;
      const outY = RESULT_Y + 1;
      const boxH = Math.min(lines.length + 2, 20);
      renderer.drawBox(0, outY, { width: termWidth, height: boxH, color: 'textDim', borderStyle: 'rounded' });
      const displayLines = lines.slice(0, 18);
      for (let i = 0; i < displayLines.length; i++) {
        const truncated = displayLines[i].length > termWidth - 4 ? displayLines[i].slice(0, termWidth - 7) + '...' : displayLines[i];
        renderer.writeText(2, outY + 1 + i, truncated, { fg: theme.colors.textDim });
      }
      if (lines.length > 18) {
        renderer.writeText(2, outY + 1 + 18, `... (${lines.length - 18} more lines)`, { fg: theme.colors.textDim });
      }
      renderer.flush();
      return;
    }

    if (toolResult.tool === 'read_file') {
      const lineCount = toolResult.output.split('\n').length;
      process.stdout.write(` ${theme.style(`${lineCount} lines`, 'textDim')}\n`);
      return;
    }

    if (toolResult.tool === 'list_directory') {
      const lines = toolResult.output.split('\n');
      for (const line of lines.slice(0, 10)) {
        process.stdout.write(`  ${theme.style(line, 'textDim')}\n`);
      }
      if (lines.length > 10) process.stdout.write(theme.style(`  ... (${lines.length} lines)\n`, 'textDim'));
      return;
    }

    const lines = toolResult.output.split('\n');
    for (const line of lines.slice(0, 5)) {
      process.stdout.write(`  ${theme.style(line, 'textDim')}\n`);
    }
    if (lines.length > 5) process.stdout.write(theme.style(`  ... (${lines.length} lines)\n`, 'textDim'));
  }
}
