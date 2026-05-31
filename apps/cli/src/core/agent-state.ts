export type AgentState =
  | 'IDLE'
  | 'ANALYZING'
  | 'UNDERSTANDING_REPOSITORY'
  | 'BUILDING_CONTEXT'
  | 'PLANNING'
  | 'WAITING_FOR_APPROVAL'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'REFLECTING'
  | 'REPAIRING'
  | 'RETRYING'
  | 'CHECKPOINTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PAUSED'
  | 'RESUMING';

export interface StateTransition {
  from: AgentState;
  to: AgentState;
  reason: string;
  at: string;
}

const TERMINAL_STATES = new Set<AgentState>(['COMPLETED', 'FAILED', 'CANCELLED']);

const ALLOWED: Record<AgentState, AgentState[]> = {
  IDLE: ['ANALYZING', 'RESUMING', 'CHECKPOINTING', 'CANCELLED', 'FAILED'],
  ANALYZING: ['UNDERSTANDING_REPOSITORY', 'BUILDING_CONTEXT', 'PLANNING', 'CHECKPOINTING', 'FAILED', 'CANCELLED'],
  UNDERSTANDING_REPOSITORY: ['BUILDING_CONTEXT', 'PLANNING', 'EXECUTING', 'VERIFYING', 'CHECKPOINTING', 'FAILED', 'CANCELLED'],
  BUILDING_CONTEXT: ['PLANNING', 'EXECUTING', 'VERIFYING', 'CHECKPOINTING', 'FAILED', 'CANCELLED'],
  PLANNING: ['UNDERSTANDING_REPOSITORY', 'WAITING_FOR_APPROVAL', 'EXECUTING', 'VERIFYING', 'REFLECTING', 'CHECKPOINTING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  WAITING_FOR_APPROVAL: ['EXECUTING', 'CANCELLED', 'FAILED'],
  EXECUTING: ['VERIFYING', 'REFLECTING', 'REPAIRING', 'RETRYING', 'CHECKPOINTING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  VERIFYING: ['REFLECTING', 'REPAIRING', 'RETRYING', 'CHECKPOINTING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  REFLECTING: ['PLANNING', 'REPAIRING', 'RETRYING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  REPAIRING: ['EXECUTING', 'VERIFYING', 'RETRYING', 'FAILED', 'CANCELLED'],
  RETRYING: ['PLANNING', 'EXECUTING', 'FAILED', 'CANCELLED'],
  CHECKPOINTING: ['UNDERSTANDING_REPOSITORY', 'PLANNING', 'EXECUTING', 'VERIFYING', 'REFLECTING', 'COMPLETED', 'FAILED', 'CANCELLED'],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
  PAUSED: ['RESUMING', 'CANCELLED'],
  RESUMING: ['BUILDING_CONTEXT', 'PLANNING', 'EXECUTING', 'FAILED', 'CANCELLED'],
};

export class AgentStateMachine {
  private state: AgentState = 'IDLE';
  private readonly transitions: StateTransition[] = [];

  current(): AgentState {
    return this.state;
  }

  history(): StateTransition[] {
    return [...this.transitions];
  }

  transition(to: AgentState, reason: string): StateTransition {
    if (to === this.state) {
      const repeated = { from: this.state, to, reason, at: new Date().toISOString() };
      this.transitions.push(repeated);
      return repeated;
    }

    if (TERMINAL_STATES.has(this.state)) {
      throw new Error(`Cannot transition from terminal state ${this.state} to ${to}`);
    }

    const allowed = ALLOWED[this.state] || [];
    if (!allowed.includes(to)) {
      throw new Error(`Invalid agent state transition: ${this.state} -> ${to}`);
    }

    const transition = { from: this.state, to, reason, at: new Date().toISOString() };
    this.state = to;
    this.transitions.push(transition);
    return transition;
  }
}
