import type { AgentState } from '../core/agent-state';
import type { ExecutionContextSnapshot } from '../context/execution-context';
import type { ExecutionReceipt } from '../cil/execution-ledger';
import type { RuntimeEvent } from '../events/types';
import { stripAnsi, truncateText } from '../ui/terminal-text';

export type V4Drawer = 'mission' | 'trace' | 'context' | 'diff' | 'agents' | 'palette' | null;

export type V4AgentName =
  | 'Orchestrator'
  | 'Planner'
  | 'Architect'
  | 'Scout'
  | 'Research'
  | 'Backend'
  | 'Frontend'
  | 'QA'
  | 'Security'
  | 'Verifier'
  | 'Recovery';

export type V4AgentStatus = 'idle' | 'thinking' | 'running' | 'waiting' | 'complete' | 'warning' | 'failed';

export interface V4AgentRow {
  name: V4AgentName;
  status: V4AgentStatus;
  detail: string;
  updatedAt?: string;
}

export interface V4MissionMessage {
  at: string;
  role: V4AgentName | 'User' | 'System';
  text: string;
}

export interface V4ContextSnapshot {
  files: string[];
  memory: string[];
  tokenDistribution: Array<{ label: string; tokens: number }>;
}

export interface V4DiffSummary {
  file: string;
  added: number;
  removed: number;
  status: 'pending' | 'applied' | 'verified' | 'failed';
}

export interface V4Metrics {
  tokensIn: number;
  tokensOut: number;
  estimatedCostUsd: number;
  contextPercent: number;
  filesModified: number;
  commandsRun: number;
  errorsFixed: number;
  checkpoints: number;
  toolCalls: number;
  failedTools: number;
}

export interface V4RuntimeViewState {
  sessionId: string;
  goal: string;
  command: string;
  cwd: string;
  projectName: string;
  model: string;
  provider: string;
  state: AgentState;
  stage: string;
  stageIndex: number;
  totalStages: number;
  progress: number;
  activeDrawer: V4Drawer;
  startedAt: string;
  updatedAt: string;
  current: {
    agent: V4AgentName;
    tool?: string;
    file?: string;
    command?: string;
    summary: string;
  };
  metrics: V4Metrics;
  missionFeed: V4MissionMessage[];
  activityFeed: RuntimeEvent[];
  context: V4ContextSnapshot;
  diffs: V4DiffSummary[];
  agents: V4AgentRow[];
  liveModelText: string;
  completionSummary?: string;
  receipt?: ExecutionReceipt;
}

export interface V4RuntimeOptions {
  sessionId: string;
  goal: string;
  command: string;
  cwd: string;
  projectName?: string;
  model: string;
  provider: string;
}

const STAGES = ['Analyze', 'Plan', 'Execute', 'Verify', 'Reflect', 'Complete'];

const AGENTS: V4AgentName[] = [
  'Orchestrator',
  'Planner',
  'Architect',
  'Scout',
  'Research',
  'Backend',
  'Frontend',
  'QA',
  'Security',
  'Verifier',
  'Recovery',
];

const STATE_STAGE: Partial<Record<AgentState, string>> = {
  IDLE: 'Analyze',
  ANALYZING: 'Analyze',
  UNDERSTANDING_REPOSITORY: 'Analyze',
  BUILDING_CONTEXT: 'Analyze',
  PLANNING: 'Plan',
  WAITING_FOR_APPROVAL: 'Plan',
  EXECUTING: 'Execute',
  VERIFYING: 'Verify',
  REFLECTING: 'Reflect',
  REPAIRING: 'Reflect',
  RETRYING: 'Reflect',
  CHECKPOINTING: 'Execute',
  COMPLETED: 'Complete',
  FAILED: 'Reflect',
  CANCELLED: 'Reflect',
  PAUSED: 'Reflect',
  RESUMING: 'Analyze',
};

export function createInitialV4RuntimeState(options: V4RuntimeOptions): V4RuntimeViewState {
  const now = new Date().toISOString();
  return {
    sessionId: options.sessionId,
    goal: options.goal,
    command: options.command,
    cwd: options.cwd,
    projectName: options.projectName || basename(options.cwd),
    model: options.model,
    provider: options.provider,
    state: 'IDLE',
    stage: 'Analyze',
    stageIndex: 1,
    totalStages: STAGES.length,
    progress: 0,
    activeDrawer: null,
    startedAt: now,
    updatedAt: now,
    current: {
      agent: 'Orchestrator',
      summary: 'Preparing the autonomous runtime.',
    },
    metrics: {
      tokensIn: 0,
      tokensOut: 0,
      estimatedCostUsd: 0,
      contextPercent: 0,
      filesModified: 0,
      commandsRun: 0,
      errorsFixed: 0,
      checkpoints: 0,
      toolCalls: 0,
      failedTools: 0,
    },
    missionFeed: [
      { at: now, role: 'User', text: options.goal },
      { at: now, role: 'Orchestrator', text: 'Session initialized. CodeThon will plan, execute, verify, and journal every step.' },
    ],
    activityFeed: [],
    context: {
      files: [],
      memory: [],
      tokenDistribution: [],
    },
    diffs: [],
    agents: AGENTS.map(name => ({
      name,
      status: name === 'Orchestrator' ? 'running' : 'idle',
      detail: name === 'Orchestrator' ? 'Runtime initialized' : 'Waiting',
      updatedAt: now,
    })),
    liveModelText: '',
  };
}

export function reduceV4RuntimeEvent(previous: V4RuntimeViewState, event: RuntimeEvent): V4RuntimeViewState {
  let state = cloneState(previous);
  state.updatedAt = event.timestamp;
  state.activityFeed = [...state.activityFeed, event].slice(-500);

  if (event.state) {
    state.state = event.state;
    applyStage(state, event.state);
  }

  switch (event.type) {
    case 'TASK_STARTED':
      state.current = { ...state.current, agent: 'Orchestrator', summary: event.message };
      state = pushMission(state, 'Orchestrator', event.message, event.timestamp);
      updateAgent(state, 'Orchestrator', 'running', 'Coordinating execution', event.timestamp);
      break;
    case 'STATE_CHANGED':
      if (event.state) applyStage(state, event.state);
      state.current.summary = event.message;
      break;
    case 'CONTEXT_BUILT': {
      const snapshot = event.data?.snapshot as ExecutionContextSnapshot | undefined;
      state.state = 'BUILDING_CONTEXT';
      applyStage(state, 'BUILDING_CONTEXT');
      state.current = { ...state.current, agent: 'Architect', summary: event.message };
      if (snapshot) {
        state.projectName = snapshot.projectName || state.projectName;
        state.context.files = unique([...snapshot.candidateFiles, ...snapshot.changedFiles]).slice(0, 80);
        state.context.memory = snapshot.memoryEntries.slice(0, 40);
        state.metrics.tokensIn = Math.max(state.metrics.tokensIn, snapshot.tokenEstimate);
        state.metrics.contextPercent = snapshot.contextPercent;
        state.context.tokenDistribution = [
          { label: 'Goal', tokens: Math.max(1, Math.round(snapshot.goal.length / 4)) },
          { label: 'Files', tokens: snapshot.candidateFiles.length * 180 },
          { label: 'Memory', tokens: Math.round(snapshot.memoryEntries.join(' ').length / 4) },
          { label: 'Scripts', tokens: Math.round(snapshot.scripts.join(' ').length / 4) },
        ];
      }
      updateAgent(state, 'Architect', 'complete', 'Execution context built', event.timestamp);
      updateAgent(state, 'Scout', 'complete', snapshot ? `${snapshot.candidateFiles.length} relevant files selected` : 'Repository context captured', event.timestamp);
      state = pushMission(state, 'Architect', event.message, event.timestamp);
      break;
    }
    case 'PLAN_CREATED':
      state.state = 'PLANNING';
      applyStage(state, 'PLANNING');
      state.current = { ...state.current, agent: 'Planner', tool: undefined, summary: event.message };
      state.liveModelText = '';
      state = pushMission(state, 'Planner', event.message, event.timestamp);
      updateAgent(state, 'Planner', 'thinking', `Planning step ${event.iteration || ''}`.trim(), event.timestamp);
      updateAgent(state, 'Architect', 'waiting', 'Waiting for plan evidence', event.timestamp);
      break;
    case 'MODEL_CALLED': {
      const chars = Number(event.data?.chars || 0);
      const tokens = Math.max(1, Math.round(chars / 4));
      state.metrics.tokensOut = Math.max(state.metrics.tokensOut, tokens);
      state.metrics.estimatedCostUsd = estimateCost(state.metrics.tokensIn + state.metrics.tokensOut);
      state.metrics.contextPercent = Math.min(100, Math.round(((state.metrics.tokensIn + state.metrics.tokensOut) / 128000) * 100));
      state.current = { ...state.current, agent: 'Planner', summary: event.message };
      updateAgent(state, 'Planner', 'thinking', `Streaming visible plan (${tokens.toLocaleString()} est. tokens)`, event.timestamp);
      break;
    }
    case 'TOOL_STARTED': {
      const agent = agentForEvent(event);
      state.metrics.toolCalls++;
      state.current = {
        ...state.current,
        agent,
        tool: event.tool,
        file: fileLikeTarget(event.target),
        command: event.tool === 'run_command' ? event.target : state.current.command,
        summary: event.message,
      };
      updateAgent(state, agent, 'running', event.message, event.timestamp);
      state = pushMission(state, agent, `Starting ${event.message}`, event.timestamp);
      addContextTarget(state, event);
      break;
    }
    case 'TOOL_COMPLETED':
    case 'FILE_READ': {
      const agent = agentForEvent(event);
      state.current = { ...state.current, agent, tool: event.tool, file: fileLikeTarget(event.target), summary: event.message };
      updateAgent(state, agent, 'complete', event.message, event.timestamp);
      addContextTarget(state, event);
      break;
    }
    case 'TOOL_FAILED':
      state.metrics.failedTools++;
      state.current = { ...state.current, agent: 'Recovery', summary: event.message };
      state = pushMission(state, 'Recovery', event.message, event.timestamp);
      updateAgent(state, agentForEvent(event), 'failed', event.message, event.timestamp);
      updateAgent(state, 'Recovery', 'warning', 'Preparing repair path', event.timestamp);
      break;
    case 'FILE_UPDATED': {
      const target = event.target || 'unknown file';
      state.metrics.filesModified = unique([...state.diffs.map(diff => diff.file), target]).length;
      state.diffs = upsertDiff(state.diffs, target, 'applied');
      state.current = { ...state.current, agent: agentForEvent(event), file: target, summary: event.message };
      state = pushMission(state, agentForEvent(event), `Updated ${target}`, event.timestamp);
      break;
    }
    case 'COMMAND_EXECUTED':
      state.metrics.commandsRun++;
      state.current = { ...state.current, agent: 'QA', command: event.target || event.message, summary: event.message };
      updateAgent(state, 'QA', 'complete', event.message, event.timestamp);
      break;
    case 'COMMAND_FAILED':
      state.metrics.commandsRun++;
      state.metrics.failedTools++;
      state.current = { ...state.current, agent: 'QA', command: event.target || event.message, summary: event.message };
      updateAgent(state, 'QA', 'failed', event.message, event.timestamp);
      updateAgent(state, 'Recovery', 'warning', 'Command failed; repair may be needed', event.timestamp);
      break;
    case 'CHECKPOINT_CREATED':
      state.metrics.checkpoints++;
      state.current.summary = event.message;
      updateAgent(state, 'Recovery', 'complete', event.message, event.timestamp);
      break;
    case 'RECEIPT_CREATED':
      state.current = { ...state.current, agent: 'Verifier', summary: event.message };
      updateAgent(state, 'Verifier', 'complete', 'Completion receipt created', event.timestamp);
      state = pushMission(state, 'Verifier', event.message, event.timestamp);
      break;
    case 'TASK_COMPLETED':
      state.state = 'COMPLETED';
      applyStage(state, 'COMPLETED');
      state.progress = 100;
      state.completionSummary = event.message;
      state.current = { ...state.current, agent: 'Verifier', summary: event.message };
      state = pushMission(state, 'Verifier', `Completed: ${event.message}`, event.timestamp);
      completeActiveAgents(state, event.timestamp);
      break;
    case 'TASK_FAILED':
      state.state = 'FAILED';
      applyStage(state, 'FAILED');
      state.completionSummary = event.message;
      state.current = { ...state.current, agent: 'Recovery', summary: event.message };
      state = pushMission(state, 'Recovery', `Failed: ${event.message}`, event.timestamp);
      updateAgent(state, 'Recovery', 'failed', event.message, event.timestamp);
      break;
    case 'TASK_CANCELLED':
      state.state = 'CANCELLED';
      applyStage(state, 'CANCELLED');
      state.completionSummary = event.message;
      state.current = { ...state.current, agent: 'Recovery', summary: event.message };
      state = pushMission(state, 'Recovery', `Cancelled: ${event.message}`, event.timestamp);
      updateAgent(state, 'Recovery', 'warning', event.message, event.timestamp);
      break;
    default:
      state.current.summary = event.message;
      break;
  }

  state.context.tokenDistribution = tokenDistribution(state);
  return state;
}

export function appendV4ModelToken(previous: V4RuntimeViewState, token: string): V4RuntimeViewState {
  const state = cloneState(previous);
  const next = `${state.liveModelText}${token}`;
  const clean = cleanModelStreamText(next);
  state.liveModelText = clean.length > 4000 ? clean.slice(-4000) : clean;
  const tokens = Math.round(stripAnsi(state.liveModelText).length / 4);
  state.metrics.tokensOut = Math.max(state.metrics.tokensOut, tokens);
  state.metrics.estimatedCostUsd = estimateCost(state.metrics.tokensIn + state.metrics.tokensOut);
  state.metrics.contextPercent = Math.min(100, Math.round(((state.metrics.tokensIn + state.metrics.tokensOut) / 128000) * 100));
  state.context.tokenDistribution = tokenDistribution(state);
  updateAgent(state, 'Planner', 'thinking', `Streaming visible plan (${stripAnsi(state.liveModelText).length.toLocaleString()} chars)`, new Date().toISOString());
  return state;
}

export function setV4Drawer(previous: V4RuntimeViewState, drawer: V4Drawer): V4RuntimeViewState {
  return { ...cloneState(previous), activeDrawer: drawer };
}

function applyStage(state: V4RuntimeViewState, agentState: AgentState): void {
  const stage = STATE_STAGE[agentState] || state.stage;
  const index = Math.max(0, STAGES.indexOf(stage));
  state.stage = stage;
  state.stageIndex = index + 1;
  state.totalStages = STAGES.length;
  if (agentState === 'COMPLETED') {
    state.progress = 100;
    return;
  }
  if (agentState === 'FAILED' || agentState === 'CANCELLED') {
    state.progress = Math.max(state.progress, Math.round((index / Math.max(1, STAGES.length - 1)) * 100));
    return;
  }
  state.progress = Math.max(state.progress, Math.round((index / Math.max(1, STAGES.length - 1)) * 100));
}

function pushMission(state: V4RuntimeViewState, role: V4MissionMessage['role'], text: string, at: string): V4RuntimeViewState {
  return {
    ...state,
    missionFeed: [
      ...state.missionFeed,
      { at, role, text: truncateText(cleanText(text), 500) },
    ].slice(-120),
  };
}

function updateAgent(state: V4RuntimeViewState, name: V4AgentName, status: V4AgentStatus, detail: string, updatedAt: string): void {
  state.agents = state.agents.map(agent =>
    agent.name === name ? { ...agent, status, detail: truncateText(cleanText(detail), 120), updatedAt } : agent
  );
}

function completeActiveAgents(state: V4RuntimeViewState, updatedAt: string): void {
  state.agents = state.agents.map(agent => {
    if (agent.status === 'running' || agent.status === 'thinking' || agent.status === 'waiting') {
      return { ...agent, status: 'complete', detail: 'No pending work', updatedAt };
    }
    return agent;
  });
}

function addContextTarget(state: V4RuntimeViewState, event: RuntimeEvent): void {
  const target = fileLikeTarget(event.target);
  if (!target) return;
  state.context.files = unique([...state.context.files, target]).slice(-80);
  state.metrics.tokensIn = Math.max(state.metrics.tokensIn, state.context.files.length * 220);
  state.metrics.contextPercent = Math.min(100, Math.round(((state.metrics.tokensIn + state.metrics.tokensOut) / 128000) * 100));
}

function upsertDiff(diffs: V4DiffSummary[], file: string, status: V4DiffSummary['status']): V4DiffSummary[] {
  const found = diffs.find(item => item.file === file);
  if (found) {
    return diffs.map(item => item.file === file ? { ...item, status } : item);
  }
  return [...diffs, { file, added: 0, removed: 0, status }].slice(-80);
}

function agentForEvent(event: RuntimeEvent): V4AgentName {
  const target = `${event.target || ''} ${event.message || ''}`.toLowerCase();
  const tool = event.tool || '';
  if (tool === 'web_search' || tool === 'crawl_url') return 'Research';
  if (tool === 'read_file' || tool === 'list_directory' || tool === 'search_files' || tool === 'grep_search') return 'Scout';
  if (/test|coverage|typecheck|lint|build|verify|check/.test(target)) return 'QA';
  if (/\.tsx|\.jsx|component|page|app\/|pages\/|css|tailwind/.test(target)) return 'Frontend';
  if (/api|route|server|db|schema|prisma|supabase|auth|service|controller/.test(target)) return 'Backend';
  if (/security|secret|token|credential|policy/.test(target)) return 'Security';
  if (tool === 'write_file' || tool === 'run_command') return 'Backend';
  return 'Planner';
}

function fileLikeTarget(value?: string): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return undefined;
  if (value.length > 180) return undefined;
  return value;
}

function tokenDistribution(state: V4RuntimeViewState): Array<{ label: string; tokens: number }> {
  const fileTokens = state.context.files.length * 220;
  const memoryTokens = state.context.memory.length * 120;
  const outputTokens = state.metrics.tokensOut;
  const goalTokens = Math.max(1, Math.round(state.goal.length / 4));
  return [
    { label: 'Goal', tokens: goalTokens },
    { label: 'Files', tokens: fileTokens },
    { label: 'Memory', tokens: memoryTokens },
    { label: 'Output', tokens: outputTokens },
  ];
}

function estimateCost(tokens: number): number {
  return Number(((tokens / 1_000_000) * 0.25).toFixed(4));
}

function cloneState(state: V4RuntimeViewState): V4RuntimeViewState {
  return {
    ...state,
    current: { ...state.current },
    metrics: { ...state.metrics },
    missionFeed: [...state.missionFeed],
    activityFeed: [...state.activityFeed],
    context: {
      files: [...state.context.files],
      memory: [...state.context.memory],
      tokenDistribution: [...state.context.tokenDistribution],
    },
    diffs: [...state.diffs],
    agents: state.agents.map(agent => ({ ...agent })),
  };
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)));
}

function basename(value: string): string {
  return value.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'workspace';
}

function cleanText(value: string): string {
  return cleanModelStreamText(value).replace(/\s+/g, ' ').trim();
}

function cleanModelStreamText(value: string): string {
  let text = stripAnsi(value);
  text = text.replace(/<TOOL_CALL>[\s\S]*?<\/TOOL_CALL>/g, ' ');
  text = text.replace(/TOOL_CALL:\s*\{[\s\S]*?\}(?=\s|$)/g, ' ');
  text = text.replace(/(?:^|[\s{,])"?tool"?\s*:\s*"[^"]+"\s*,\s*"?args"?\s*:\s*\{[^}]*\}\s*\}?/g, ' ');
  text = text.replace(/\b(?:read_file|write_file|list_directory|grep_search|search_files|web_search|crawl_url|run_command)"\s*,\s*"?args"?\s*:\s*\{[^}]*\}\s*\}?/g, ' ');
  text = text.replace(/<TOOL_CALL>[\s\S]*$/g, ' ');
  text = text.replace(/TOOL_CALL:\s*\{[\s\S]*$/g, ' ');
  text = text.replace(/(?:^|[\s{,])"?tool"?\s*:\s*"[^"]+"\s*,\s*"?args"?\s*:\s*\{[\s\S]*$/g, ' ');
  text = text.replace(/\b(?:read_file|write_file|list_directory|grep_search|search_files|web_search|crawl_url|run_command)"\s*,\s*"?args"?\s*:\s*\{[\s\S]*$/g, ' ');
  text = text.replace(/\{[^\n{}]*"tool"[^\n{}]*"args"[\s\S]*$/g, ' ');
  text = text.replace(/<\/?TOOL_CALL>/g, ' ');
  return text;
}
