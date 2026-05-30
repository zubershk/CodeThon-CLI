import type { CommandResult } from '@codethon/shared-types';
import { JobLoop } from '../cil/job-loop';
import type { JobStatus } from '../cil/job-loop';
import type { ToolCall, ToolResult } from '../cil/tools';
import { getLLMConfig } from '../utils/config';
import { logger } from '../utils';
import { renderAgentOutput } from '../utils/render';
import { TerminalRenderer } from '../ui/terminal-renderer';
import { theme } from '../ui/theme';
import { stripAnsi, truncateText, wrapText } from '../ui/terminal-text';

const HUMAN_TOOL: Record<string, string> = {
  read_file: 'read file',
  write_file: 'write file',
  run_command: 'command',
  list_directory: 'project scan',
  search_files: 'file search',
  grep_search: 'code search',
  web_search: 'web search',
  crawl_url: 'web page read',
};

const MIN_RENDER_WIDTH = 72;
const MIN_RENDER_HEIGHT = 24;
const MAX_ACTIVITY_LINES = 6;
const MAX_PREVIEW_CHARS = 6000;

type PreviewMode = 'assistant' | 'message';

function fmtTime(seconds?: number): string {
  if (seconds == null) return '';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function progressBar(progress: number, width: number): string {
  const safeWidth = Math.max(8, width);
  const clamped = Math.max(0, Math.min(1, progress));
  const filled = Math.round(clamped * safeWidth);
  return `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, safeWidth - filled))}`;
}

function pushActivity(lines: string[], line: string): void {
  const clean = stripAnsi(line).trim();
  if (!clean) return;
  lines.push(clean);
  if (lines.length > MAX_ACTIVITY_LINES) {
    lines.splice(0, lines.length - MAX_ACTIVITY_LINES);
  }
}

function pickStringArg(args: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function formatCommand(value: string, width = 72): string {
  return truncateText(value.replace(/\s+/g, ' ').trim(), width);
}

function printRuntimeGuide(goal: string, modelLabel: string, maxIterations: number, display: string): void {
  logger.labelValue('Goal', goal);
  logger.labelValue('Model', modelLabel);
  logger.labelValue('Agent', `autonomous build loop · up to ${maxIterations} steps`);
  logger.labelValue('Display', display);
  logger.labelValue('Controls', 'Ctrl+C cancel · Ctrl+C twice force quit · --ask gates writes · --dry-run previews');
  logger.divider();
  logger.info('CodeThon will explain each action in plain language, run allowed tools, then summarize the result.');
  logger.info('Tool JSON is hidden during normal execution. Use --debug only when you need raw internals.');
  logger.divider();
}

function describeToolCall(call: ToolCall): { title: string; detail: string } {
  const { tool, args } = call;
  const filePath = pickStringArg(args, ['path', 'file', 'filename', 'target']);
  const pattern = pickStringArg(args, ['pattern', 'include']);
  const query = pickStringArg(args, ['query']);
  const command = pickStringArg(args, ['command']);
  const url = pickStringArg(args, ['url']);

  switch (tool) {
    case 'read_file':
      return {
        title: `Opening ${filePath || 'a file'}`,
        detail: `Reading ${filePath || 'the requested file'} so the agent can understand the current implementation before making changes.`,
      };
    case 'write_file':
      return {
        title: `Updating ${filePath || 'a file'}`,
        detail: `Applying the next code change in ${filePath || 'the target file'}.`,
      };
    case 'list_directory':
      return {
        title: `Checking ${filePath || 'the project layout'}`,
        detail: `Scanning ${filePath || 'the project root'} to understand folders, entry points, and project structure.`,
      };
    case 'search_files':
      return {
        title: `Finding files for ${pattern || 'the current task'}`,
        detail: `Looking for files that match ${pattern || 'the requested pattern'} to narrow down where changes are needed.`,
      };
    case 'grep_search':
      return {
        title: `Searching code for ${pattern || 'the requested text'}`,
        detail: `Looking through the codebase for ${pattern || 'matching content'} to find the right place to inspect or edit.`,
      };
    case 'run_command':
      return {
        title: `Running ${formatCommand(command || 'a command', 48)}`,
        detail: `Executing ${formatCommand(command || 'the requested command')} to validate the project or inspect its current state.`,
      };
    case 'web_search':
      return {
        title: 'Searching the web',
        detail: `Looking up ${query || 'the requested topic'} for documentation or examples.`,
      };
    case 'crawl_url':
      return {
        title: 'Reading a web page',
        detail: `Opening ${url || 'the requested page'} to pull the relevant documentation into the task.`,
      };
    default:
      return {
        title: `Running ${HUMAN_TOOL[tool] || tool}`,
        detail: `Working on the next ${HUMAN_TOOL[tool] || tool} step.`,
      };
  }
}

function summarizeLines(lines: string[], width: number, maxLines: number): string {
  const visible = lines
    .map(line => truncateText(line.trim(), width))
    .filter(Boolean)
    .slice(0, maxLines);
  return visible.join('\n');
}

function summarizeToolOutput(toolResult: ToolResult, width: number): string {
  if (toolResult.error) {
    return truncateText(stripAnsi(toolResult.error), width * 3);
  }

  const output = stripAnsi(toolResult.output || '').replace(/\r/g, '').trim();
  if (!output) {
    return 'The step finished without terminal output.';
  }

  const lines = output.split('\n').map(line => line.trim()).filter(Boolean);

  switch (toolResult.tool) {
    case 'read_file':
      return truncateText(`Opened ${lines[0] || 'the requested file'}.`, width * 2);
    case 'write_file':
      return truncateText(lines[0] || 'Saved the requested file.', width * 2);
    case 'list_directory': {
      const items = lines.slice(1, 7);
      return items.length > 0
        ? `Top entries:\n${items.map(item => `- ${truncateText(item, Math.max(12, width - 2))}`).join('\n')}`
        : 'Scanned the requested folder.';
    }
    case 'search_files': {
      const items = lines.slice(1, 7);
      return items.length > 0
        ? `Matching files:\n${items.map(item => `- ${truncateText(item, Math.max(12, width - 2))}`).join('\n')}`
        : (lines[0] || 'No matching files found.');
    }
    case 'grep_search': {
      const items = lines.slice(1, 6);
      return items.length > 0
        ? `Matches:\n${items.map(item => `- ${truncateText(item, Math.max(12, width - 2))}`).join('\n')}`
        : (lines[0] || 'No matching lines found.');
    }
    case 'run_command':
      return summarizeLines(lines.slice(-8), width, 8) || 'The command finished without output.';
    case 'web_search': {
      const items = lines.filter(line => /^\[\d+\]/.test(line)).slice(0, 4);
      return items.length > 0
        ? `Search results:\n${items.map(item => `- ${truncateText(item.replace(/^\[\d+\]\s*/, ''), Math.max(12, width - 2))}`).join('\n')}`
        : summarizeLines(lines, width, 6);
    }
    case 'crawl_url': {
      const titleLine = lines.find(line => line.startsWith('Title:'));
      const descriptionLine = lines.find(line => line.startsWith('Description:'));
      return [titleLine, descriptionLine]
        .filter(Boolean)
        .map(line => truncateText(line!, width))
        .join('\n') || summarizeLines(lines, width, 6);
    }
    default:
      return summarizeLines(lines, width, 8);
  }
}

function parseToolCallsFromBuffer(raw: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const lines = stripAnsi(raw).replace(/\r/g, '').split('\n').filter(line => line.includes('TOOL_CALL:'));

  for (const line of lines) {
    const jsonStart = line.indexOf('{');
    if (jsonStart < 0) continue;

    const jsonText = line.slice(jsonStart);
    try {
      const parsed = JSON.parse(jsonText) as { id?: string; tool?: string; args?: Record<string, unknown> };
      if (parsed.id && parsed.tool) {
        calls.push({ id: parsed.id, tool: parsed.tool, args: parsed.args || {} });
      }
    } catch {
      const toolMatch = jsonText.match(/"tool"\s*:\s*"([^"]+)/);
      if (toolMatch) {
        calls.push({ id: `${calls.length + 1}`, tool: toolMatch[1], args: {} });
      }
    }
  }

  return calls;
}

function summarizeAssistantBuffer(raw: string, width: number): { title: string; text: string } {
  const cleaned = stripAnsi(raw).replace(/\r/g, '').trim();
  if (!cleaned) {
    return {
      title: 'What CodeThon Is Doing',
      text: 'Reviewing the project and deciding the next safe step.',
    };
  }

  const doneMatch = cleaned.match(/DONE:\s*([\s\S]*)$/i);
  if (doneMatch?.[1]?.trim()) {
    return {
      title: 'Summary',
      text: doneMatch[1].trim(),
    };
  }

  if (cleaned.includes('TOOL_CALL:')) {
    const calls = parseToolCallsFromBuffer(cleaned);
    if (calls.length > 0) {
      return {
        title: 'Planned Actions',
        text: calls
          .slice(0, 6)
          .map((call, index) => `${index + 1}. ${truncateText(describeToolCall(call).title, Math.max(12, width - 3))}`)
          .join('\n'),
      };
    }

    const toolNameMatch = cleaned.match(/"tool"\s*:\s*"([^"]+)/);
    return {
      title: 'Planned Actions',
      text: toolNameMatch
        ? `Preparing to run ${toolNameMatch[1].replace(/_/g, ' ')}.`
        : 'Choosing the next action set.',
    };
  }

  return {
    title: 'Assistant',
    text: cleaned,
  };
}

function shouldUseFullscreenRenderer(): boolean {
  if (process.env.CODETHON_FULLSCREEN === '1') return true;
  if (process.env.CODETHON_FULLSCREEN === '0') return false;
  if (!process.stdout.isTTY || !process.stdin.isTTY) return false;
  if (process.platform === 'win32') return false;
  if ((process.stdout.columns || 0) < MIN_RENDER_WIDTH) return false;
  if ((process.stdout.rows || 0) < MIN_RENDER_HEIGHT) return false;
  if ((process.env.TERM || '').toLowerCase() === 'dumb') return false;
  return true;
}

async function executeLineMode(goal: string, askMode: boolean, dryRun: boolean, modelLabel: string): Promise<CommandResult> {
  const maxIterations = 40;
  const loop = new JobLoop(process.cwd(), maxIterations, askMode, dryRun);
  let interruptCount = 0;

  const cleanupSignalHandlers = () => {
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
  };

  const handleSignal = () => {
    interruptCount++;
    loop.cancel('Execution interrupted by user.');

    if (interruptCount > 1) {
      cleanupSignalHandlers();
      process.stderr.write('\nExecution interrupted. Force quitting.\n');
      process.exit(130);
    }

    process.stderr.write('\nExecution interrupted. Waiting for the current step to stop. Press Ctrl+C again to force quit.\n');
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);

  logger.section('CodeThon CLI — Execute');
  printRuntimeGuide(goal, modelLabel, maxIterations, 'scrollback-safe line mode');

  try {
    const result = await loop.execute(
      goal,
      (status: JobStatus) => {
        if (status.phase === 'plan' && !status.done) {
          logger.info(`Step ${status.iteration + 1}/${maxIterations}: reviewing the project and planning the next action`);
        } else if (status.phase === 'tool_call' && status.toolCall) {
          logger.info(describeToolCall(status.toolCall).title);
        } else if (status.phase === 'tool_result' && status.toolResult) {
          const label = HUMAN_TOOL[status.toolResult.tool] || status.toolResult.tool;
          if (status.toolResult.error) {
            logger.warn(`${label}: ${status.toolResult.error}`);
          } else {
            logger.info(`${label}: done`);
          }
        }
      },
    );

    logger.divider();
    logger.labelValue('Iterations', String(result.iterations));
    logger.labelValue('Elapsed', fmtTime(result.elapsed));
    logger.labelValue('Status', result.success ? 'goal met' : 'incomplete');
    if (result.summary) {
      console.log('');
      renderAgentOutput(result.summary);
    }
    console.log('');

    return {
      success: result.success,
      message: result.summary,
      data: result as unknown as Record<string, unknown>,
    };
  } finally {
    cleanupSignalHandlers();
  }
}

export async function executeCommand(goal: string, askMode = false, dryRun = false): Promise<CommandResult> {
  if (!goal) {
    process.stderr.write(`${theme.style('Error: No goal specified.', 'error')} Usage: ct execute "<goal>"\n`);
    return { success: false, message: 'No goal specified' };
  }

  const config = getLLMConfig();
  const modelLabel = config.model?.split('/').pop() || config.model || 'unknown';

  if (!shouldUseFullscreenRenderer()) {
    return executeLineMode(goal, askMode, dryRun, modelLabel);
  }

  const maxIterations = 40;
  const loop = new JobLoop(process.cwd(), maxIterations, askMode, dryRun);
  const renderer = new TerminalRenderer();
  const view = {
    currentTask: 'Getting ready',
    currentStage: 'Starting',
    progress: 0,
    elapsed: '0s',
    activity: ['Waiting for the first step...'],
    previewMode: 'assistant' as PreviewMode,
    previewTitle: 'What CodeThon Is Doing',
    previewText: 'Reviewing the project and choosing a safe first step.',
    assistantBuffer: '',
    statusLine: 'Preparing the execution loop',
    errors: [] as string[],
  };

  let streamBuffer = '';
  let lastRenderAt = 0;
  let renderTimer: ReturnType<typeof setTimeout> | null = null;
  let result: Awaited<ReturnType<JobLoop['execute']>> | null = null;
  let screenClosed = false;
  let signalHandlerInstalled = false;
  let interruptCount = 0;

  const cleanupScreen = () => {
    if (screenClosed) return;
    screenClosed = true;
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }
    renderer.dispose({ restoreScreen: true });
  };

  const cleanupSignalHandlers = () => {
    if (!signalHandlerInstalled) return;
    process.off('SIGINT', handleSignal);
    process.off('SIGTERM', handleSignal);
    signalHandlerInstalled = false;
  };

  const renderFrame = () => {
    if (screenClosed) return;

    const dimensions = renderer.dimensions;
    const boxWidth = Math.max(64, Math.min(dimensions.width - 2, 100));
    const boxX = Math.max(0, Math.min(1, dimensions.width - boxWidth));
    const headerY = 0;
    const headerH = 6;
    const stepY = headerY + headerH;
    const stepH = 5;
    const activityY = stepY + stepH;
    const activityH = 8;
    const previewY = activityY + activityH;
    const previewH = Math.max(6, dimensions.height - previewY - 1);
    const innerWidth = boxWidth - 4;
    const preview = view.previewMode === 'assistant'
      ? summarizeAssistantBuffer(view.assistantBuffer, innerWidth)
      : { title: view.previewTitle, text: view.previewText || 'Waiting for output...' };

    renderer.clear();

    renderer.drawBox(boxX, headerY, { width: boxWidth, height: headerH, title: ' Execute ', color: 'primary', borderStyle: 'double' });
    renderer.writeText(boxX + 2, headerY + 1, truncateText(`Goal: ${goal}`, innerWidth), { fg: theme.colors.textBright, bold: true });
    renderer.writeText(boxX + 2, headerY + 2, truncateText(`AI model: ${modelLabel}`, innerWidth), { fg: theme.colors.textDim });
    renderer.writeText(boxX + 2, headerY + 3, truncateText(`${view.currentStage} | elapsed ${view.elapsed}`, innerWidth), { fg: theme.colors.text });
    renderer.writeText(boxX + 2, headerY + 4, truncateText('Controls: Ctrl+C cancel · Ctrl+C twice force quit · ask/dry-run flags respected', innerWidth), { fg: theme.colors.textDim });

    renderer.drawBox(boxX, stepY, { width: boxWidth, height: stepH, title: ' Current Step ', color: 'warning', borderStyle: 'rounded' });
    renderer.writeText(boxX + 2, stepY + 1, truncateText(view.currentTask, innerWidth), { fg: theme.colors.textBright, bold: true });
    renderer.writeText(boxX + 2, stepY + 2, truncateText(view.statusLine, innerWidth), { fg: theme.colors.textDim });
    renderer.writeText(boxX + 2, stepY + 3, progressBar(view.progress, Math.max(12, innerWidth - 8)), { fg: theme.colors.primary });

    renderer.drawBox(boxX, activityY, { width: boxWidth, height: activityH, title: ' Recent Actions ', color: 'info', borderStyle: 'rounded' });
    const activityLines = view.activity.slice(-Math.max(1, activityH - 2));
    for (let i = 0; i < activityLines.length && i < activityH - 2; i++) {
      renderer.writeText(boxX + 2, activityY + 1 + i, truncateText(activityLines[i], innerWidth), { fg: theme.colors.text });
    }

    renderer.drawBox(boxX, previewY, { width: boxWidth, height: previewH, title: ` ${preview.title} `, color: view.errors.length > 0 ? 'error' : 'secondary', borderStyle: 'rounded' });
    const previewLines = wrapText(preview.text || 'Waiting for output...', innerWidth).slice(-(previewH - 2));
    for (let i = 0; i < previewLines.length && i < previewH - 2; i++) {
      renderer.writeText(boxX + 2, previewY + 1 + i, truncateText(previewLines[i], innerWidth), { fg: theme.colors.textDim });
    }

    renderer.flush();
  };

  const scheduleRender = (force = false) => {
    if (screenClosed) return;
    if (renderTimer) {
      clearTimeout(renderTimer);
      renderTimer = null;
    }

    const now = Date.now();
    if (force || now - lastRenderAt > 33) {
      renderFrame();
      lastRenderAt = now;
      return;
    }

    renderTimer = setTimeout(() => {
      renderTimer = null;
      if (screenClosed) return;
      renderFrame();
      lastRenderAt = Date.now();
    }, 33);
  };

  const handleSignal = () => {
    interruptCount++;
    loop.cancel('Execution interrupted by user.');
    cleanupScreen();

    if (interruptCount > 1) {
      cleanupSignalHandlers();
      process.stderr.write('\nExecution interrupted. Force quitting.\n');
      process.exit(130);
    }

    process.stderr.write('\nExecution interrupted. Waiting for the current step to stop. Press Ctrl+C again to force quit.\n');
  };

  process.on('SIGINT', handleSignal);
  process.on('SIGTERM', handleSignal);
  signalHandlerInstalled = true;

  renderer.enterAlternateScreen();
  renderer.hideCursor();
  renderer.clearScreen();
  scheduleRender(true);

  try {
    result = await loop.execute(
      goal,
      (status: JobStatus) => {
        if (status.phase === 'plan' && !status.done) {
          streamBuffer = '';
          view.previewMode = 'assistant';
          view.previewTitle = 'What CodeThon Is Doing';
          view.previewText = 'Reviewing the project and choosing the next safe step.';
          view.assistantBuffer = '';
          view.currentTask = `Step ${status.iteration + 1} of ${maxIterations}`;
          view.currentStage = 'Thinking';
          view.statusLine = 'Reviewing the project and deciding what to do next';
          view.progress = status.iteration / maxIterations;
          view.elapsed = fmtTime(status.totalElapsed);
          pushActivity(view.activity, `Thinking through step ${status.iteration + 1}`);
        } else if (status.phase === 'tool_call' && status.toolCall) {
          const description = describeToolCall(status.toolCall);
          view.previewMode = 'message';
          view.previewTitle = 'Current Action';
          view.previewText = description.detail;
          view.currentStage = 'Working';
          view.currentTask = description.title;
          view.statusLine = 'Running the next action';
          pushActivity(view.activity, description.title);
        } else if (status.phase === 'tool_result' && status.toolResult) {
          const label = HUMAN_TOOL[status.toolResult.tool] || status.toolResult.tool;
          view.previewMode = 'message';
          view.previewTitle = status.toolResult.error ? 'Issue Found' : 'Latest Result';
          view.previewText = summarizeToolOutput(status.toolResult, Math.max(20, renderer.dimensions.width - 8));
          view.currentStage = status.toolResult.error ? 'Needs attention' : 'Completed';
          view.currentTask = status.toolResult.error ? `${label} needs attention` : `${label} finished`;
          view.statusLine = status.toolResult.error ? 'The last step returned an error' : 'The last step finished successfully';
          if (status.toolResult.error) {
            view.errors.push(status.toolResult.error);
            pushActivity(view.activity, `${label}: issue found`);
          } else {
            pushActivity(view.activity, `${label}: done`);
          }
        } else if (status.phase === 'done') {
          view.previewMode = 'message';
          view.previewTitle = status.error ? 'Execution Status' : 'Summary';
          view.previewText = status.description || (status.error ? 'Execution stopped.' : 'Goal completed.');
          view.currentStage = status.error ? 'Stopped' : 'Finished';
          view.currentTask = status.error ? 'Execution stopped' : 'Goal completed';
          view.statusLine = status.description || 'Done';
          view.progress = 1;
          view.elapsed = fmtTime(status.totalElapsed);
          if (status.error) {
            view.errors.push(status.error);
            pushActivity(view.activity, 'Execution stopped');
          } else {
            pushActivity(view.activity, 'Goal completed');
          }
        }

        scheduleRender();
      },
      (token: string) => {
        streamBuffer += token;
        if (streamBuffer.length > MAX_PREVIEW_CHARS) {
          streamBuffer = streamBuffer.slice(-MAX_PREVIEW_CHARS);
        }
        view.previewMode = 'assistant';
        view.assistantBuffer = streamBuffer;
        scheduleRender();
      },
    );

    scheduleRender(true);
  } finally {
    cleanupSignalHandlers();
    cleanupScreen();
  }

  if (!result) {
    return { success: false, message: 'Execution failed before result was produced' };
  }

  logger.section('CodeThon CLI — Execute');
  logger.labelValue('Goal', goal);
  logger.labelValue('Model', modelLabel);
  logger.labelValue('Iterations', String(result.iterations));
  logger.labelValue('Elapsed', fmtTime(result.elapsed));
  logger.labelValue('Status', result.success ? 'goal met' : 'incomplete');
  if (result.summary) {
    console.log('');
    renderAgentOutput(result.summary);
  }
  console.log('');

  return {
    success: result.success,
    message: result.summary,
    data: result as unknown as Record<string, unknown>,
  };
}
