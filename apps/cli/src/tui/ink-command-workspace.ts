import React, { useEffect } from 'react';
import { Box, Text, render, useApp } from 'ink';
import type { CommandResult } from '@codethon/shared-types';
import { truncateText } from '../ui/terminal-text';

export interface CommandWorkspaceSummaryOptions {
  command: string;
  result: CommandResult;
  durationMs: number;
  provider: string;
  model: string;
  cwd: string;
}

const ACCENT = '#dfff72';
const CYAN = '#74d7ff';
const GREEN = '#82f7a6';
const YELLOW = '#ffcf5c';
const RED = '#ff5c7a';
const DIM = '#899691';
const WHITE = '#ffffff';

export function shouldRenderCommandWorkspace(command: string, output: string, tuiEnabled: boolean): boolean {
  if (!tuiEnabled) return false;
  if (output === 'json') return false;
  if (process.env.CODETHON_COMMAND_WORKSPACE === '0') return false;
  if (!process.stdout.isTTY) return false;
  if ((process.env.TERM || '').toLowerCase() === 'dumb') return false;

  const normalized = command.replace(/^ct\s+/, '').split(/\s+/)[0]?.toLowerCase();
  if (!normalized) return false;
  if (['auto', 'execute', 'clear'].includes(normalized)) return false;
  return true;
}

export async function renderCommandWorkspaceSummary(options: CommandWorkspaceSummaryOptions): Promise<void> {
  const instance = render(React.createElement(CommandWorkspaceSummary, options), {
    stdout: process.stdout,
    stderr: process.stderr,
    exitOnCtrlC: false,
  });
  await instance.waitUntilExit();
}

function CommandWorkspaceSummary(options: CommandWorkspaceSummaryOptions): React.ReactElement {
  const { exit } = useApp();
  const status = options.result.success ? 'COMPLETE' : 'NEEDS ATTENTION';
  const statusColor = options.result.success ? GREEN : RED;
  const duration = formatDuration(options.durationMs);
  const nextActions = suggestedNextActions(options.command, options.result.success);

  useEffect(() => {
    const timer = setTimeout(() => exit(), 20);
    return () => clearTimeout(timer);
  }, [exit]);

  return React.createElement(
    Box,
    { flexDirection: 'column', borderStyle: 'round', borderColor: ACCENT, paddingX: 1, marginTop: 1 },
    React.createElement(
      Box,
      { justifyContent: 'space-between' },
      React.createElement(Text, { color: ACCENT, bold: true }, `CodeThon Workspace  ›  ${options.command}`),
      React.createElement(Text, { color: statusColor, bold: true }, status),
    ),
    React.createElement(
      Box,
      { marginTop: 1 },
      React.createElement(
        Box,
        { flexDirection: 'column', width: '50%' },
        row('Command', options.command, CYAN),
        row('Runtime', duration, WHITE),
        row('Directory', compactPath(options.cwd), DIM),
      ),
      React.createElement(
        Box,
        { flexDirection: 'column', width: '50%' },
        row('Provider', options.provider || 'unknown', CYAN),
        row('Model', options.model || 'unknown', WHITE),
        row('Output', options.result.success ? 'rendered above' : 'check message below', options.result.success ? GREEN : YELLOW),
      ),
    ),
    React.createElement(Box, { marginTop: 1 }, React.createElement(Text, { color: WHITE, bold: true }, 'Result')),
    React.createElement(Text, { color: options.result.success ? GREEN : YELLOW }, truncateText(options.result.message || 'Command finished.', 140)),
    React.createElement(Box, { marginTop: 1 }, React.createElement(Text, { color: WHITE, bold: true }, 'Next')),
    React.createElement(
      Box,
      { flexDirection: 'column' },
      ...nextActions.map(action => React.createElement(Text, { key: action, color: DIM }, `* ${action}`)),
    ),
  );
}

function row(label: string, value: string, color: string): React.ReactElement {
  return React.createElement(
    Box,
    null,
    React.createElement(Text, { color: DIM }, `${label.padEnd(10)} `),
    React.createElement(Text, { color, bold: color !== DIM }, truncateText(value, 56)),
  );
}

function suggestedNextActions(command: string, success: boolean): string[] {
  if (!success) return ['Run ct doctor if the error is environmental.', 'Use ct inspect or ct replay for agent runs.', 'Retry with --ask if file changes need review.'];

  const normalized = command.replace(/^ct\s+/, '').split(/\s+/)[0]?.toLowerCase();
  switch (normalized) {
    case 'auth':
    case 'onboard':
    case 'model':
      return ['ct status — verify provider/model readiness.', 'ct plan "<idea>" — start planning with AI.'];
    case 'init':
      return ['ct plan — create roadmap and architecture.', 'ct execute "<goal>" — run the autonomous workspace.'];
    case 'plan':
    case 'roadmap':
    case 'architect':
    case 'analyze':
      return ['ct execute "<goal>" — execute the next concrete task.', 'ct checkpoint save "before build" — save recovery point.'];
    case 'build':
    case 'autofix':
    case 'debug':
      return ['ct diff — inspect file changes.', 'ct test status — check the test framework.', 'ct execute "verify everything" — run a final verification pass.'];
    case 'diff':
    case 'review':
    case 'git':
      return ['ct git suggest — create a commit message.', 'ct checkpoint save "reviewed changes" — capture current state.'];
    case 'readme':
    case 'launch':
    case 'deploy':
    case 'startup':
      return ['ct status — review readiness.', 'ct launch — prepare demo/submission assets.'];
    default:
      return ['ct help — see available commands.', 'ct execute "<goal>" — run the autonomous workspace.'];
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function compactPath(value: string): string {
  return value.replace(/\\/g, '/').split('/').slice(-3).join('/');
}
