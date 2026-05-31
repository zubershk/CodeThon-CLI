import type { AgentState } from '../core/agent-state';

export type RuntimeEventType =
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_FAILED'
  | 'TASK_CANCELLED'
  | 'STATE_CHANGED'
  | 'CONTEXT_BUILT'
  | 'PLAN_CREATED'
  | 'TOOL_STARTED'
  | 'TOOL_COMPLETED'
  | 'TOOL_FAILED'
  | 'FILE_READ'
  | 'FILE_UPDATED'
  | 'COMMAND_EXECUTED'
  | 'COMMAND_FAILED'
  | 'MODEL_CALLED'
  | 'MODEL_FAILED'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_COMPLETED'
  | 'CHECKPOINT_CREATED'
  | 'SESSION_RESTORED'
  | 'APPROVAL_REQUESTED'
  | 'APPROVAL_GRANTED'
  | 'APPROVAL_DENIED'
  | 'RECEIPT_CREATED';

export interface RuntimeEvent {
  id: string;
  runId: string;
  type: RuntimeEventType;
  timestamp: string;
  state?: AgentState;
  previousState?: AgentState;
  iteration?: number;
  tool?: string;
  target?: string;
  durationMs?: number;
  message: string;
  data?: Record<string, unknown>;
}

export type RuntimeEventSubscriber = (event: RuntimeEvent) => void | Promise<void>;
