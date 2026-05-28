import { TerminalRenderer, type BoxDrawOptions } from './terminal-renderer';
import { theme } from './theme';

export interface AgentState {
  id: string;
  name: string;
  icon: string;
  status: 'thinking' | 'working' | 'done' | 'error' | 'idle';
  currentTask: string;
  progress?: number;
  subtasks?: string[];
  elapsedMs?: number;
  details?: string[];
}

const STATUS_COLORS: Record<AgentState['status'], keyof typeof theme.colors> = {
  thinking: 'primary',
  working: 'warning',
  done: 'success',
  error: 'error',
  idle: 'textDim',
};

const STATUS_BARS: Record<AgentState['status'], string> = {
  thinking: '\u25D4',
  working: '\u2699',
  done: '\u2713',
  error: '\u2717',
  idle: '\u25CB',
};

export class AgentVisualizer {
  private renderer: TerminalRenderer;
  private agents: Map<string, AgentState> = new Map();
  private x: number;
  private y: number;
  private panelWidth: number;
  private maxVisible = 6;

  constructor(renderer: TerminalRenderer, x = 0, y = 0, panelWidth = 50) {
    this.renderer = renderer;
    this.x = x;
    this.y = y;
    this.panelWidth = panelWidth;
  }

  updateAgent(agentId: string, state: Partial<AgentState> & { name: string }): void {
    const existing = this.agents.get(agentId);
    this.agents.set(agentId, {
      id: agentId,
      name: state.name,
      icon: state.icon || existing?.icon || '\u2699',
      status: state.status || existing?.status || 'idle',
      currentTask: state.currentTask || existing?.currentTask || '',
      progress: state.progress ?? existing?.progress,
      subtasks: state.subtasks || existing?.subtasks,
      elapsedMs: state.elapsedMs ?? existing?.elapsedMs,
      details: state.details || existing?.details,
    });
  }

  removeAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  render(): void {
    const agents = Array.from(this.agents.values()).slice(0, this.maxVisible);
    let currentY = this.y;

    for (const agent of agents) {
      const color = STATUS_COLORS[agent.status];
      const bar = STATUS_BARS[agent.status];
      const title = ` ${bar} ${agent.icon} ${agent.name} `;

      const boxHeight = agent.subtasks ? 4 + agent.subtasks.length : 4;
      const boxOpts: BoxDrawOptions = {
        width: this.panelWidth,
        height: boxHeight,
        title,
        color,
        borderStyle: 'rounded',
      };

      this.renderer.drawBox(this.x, currentY, boxOpts);

      const indent = this.x + 2;
      let lineY = currentY + 1;

      // current task
      const taskColor = theme.colors[color];
      this.renderer.writeText(indent, lineY, agent.currentTask.slice(0, this.panelWidth - 4), { fg: taskColor });
      lineY++;

      // elapsed time
      if (agent.elapsedMs !== undefined) {
        const secs = (agent.elapsedMs / 1000).toFixed(1);
        this.renderer.writeText(indent, lineY, `\u23F1 ${secs}s`, { fg: theme.colors.textDim });
      }

      // progress bar
      if (agent.progress !== undefined) {
        const barWidth = this.panelWidth - 12;
        const filled = Math.round(agent.progress * barWidth);
        const barStr = '\u2588'.repeat(filled) + '\u2591'.repeat(barWidth - filled);
        this.renderer.writeText(indent + 10, lineY, `[${barStr}] ${Math.round(agent.progress * 100)}%`, { fg: taskColor });
      }
      lineY++;

      // subtasks
      if (agent.subtasks) {
        for (const task of agent.subtasks) {
          const done = task.startsWith('\u2713');
          this.renderer.writeText(indent + 1, lineY, task.slice(0, this.panelWidth - 6), {
            fg: done ? theme.colors.success : theme.colors.textDim,
          });
          lineY++;
        }
      }

      currentY += boxHeight + 1;
    }
  }

  clear(): void {
    this.agents.clear();
  }
}
