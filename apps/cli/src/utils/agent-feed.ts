import chalk from 'chalk';

type AgentName = 'PM' | 'Architect' | 'Debug' | 'Build' | 'Deploy' | 'Launch' | 'Research' | 'Doctor' | 'Code';

const AGENT_COLORS: Record<AgentName, (s: string) => string> = {
  PM: chalk.hex('#82f7a6'),
  Architect: chalk.hex('#d7a3ff'),
  Debug: chalk.hex('#ffcf5c'),
  Build: chalk.hex('#74d7ff'),
  Deploy: chalk.hex('#7aa7ff'),
  Launch: chalk.hex('#d7a3ff'),
  Research: chalk.hex('#f7fff9'),
  Doctor: chalk.hex('#ff5c7a'),
  Code: chalk.hex('#74d7ff'),
};

let currentLine = '';
let isActive = false;

function clearLine(): void {
  if (isActive && currentLine) {
    process.stdout.write('\r\x1b[K');
  }
}

export function startAgent(agent: AgentName, action: string): void {
  clearLine();
  const colorize = AGENT_COLORS[agent];
  const tag = colorize(`[${agent} Agent]`);
  currentLine = `  ${tag} ${chalk.hex('#f7fff9')(action)}`;
  isActive = true;
  process.stdout.write(currentLine);
}

export function updateAgent(action: string): void {
  if (!isActive) return;
  clearLine();
  const match = currentLine.match(/\[(\w+) Agent\]/);
  if (match) {
    const agent = match[1] as AgentName;
    const colorize = AGENT_COLORS[agent] || chalk.hex('#f7fff9');
    const tag = colorize(`[${agent} Agent]`);
    currentLine = `  ${tag} ${chalk.hex('#f7fff9')(action)}`;
    process.stdout.write(currentLine);
  }
}

export function succeedAgent(message?: string): void {
  if (!isActive) return;
  clearLine();
  const match = currentLine.match(/\[(\w+) Agent\]/);
  const agent = match?.[1] as AgentName | undefined;
  const tag = agent ? AGENT_COLORS[agent](`[${agent} Agent]`) : chalk.hex('#82f7a6')('[Agent]');
  const msg = message ? chalk.hex('#82f7a6')(`◆ ${message}`) : chalk.hex('#82f7a6')('◆ Done');
  console.log(`  ${tag} ${msg}`);
  isActive = false;
  currentLine = '';
}

export function failAgent(message?: string): void {
  if (!isActive) return;
  clearLine();
  const match = currentLine.match(/\[(\w+) Agent\]/);
  const agent = match?.[1] as AgentName | undefined;
  const tag = agent ? AGENT_COLORS[agent](`[${agent} Agent]`) : chalk.hex('#ff5c7a')('[Agent]');
  const msg = message ? chalk.hex('#ff5c7a')(`■ ${message}`) : chalk.hex('#ff5c7a')('■ Failed');
  console.log(`  ${tag} ${msg}`);
  isActive = false;
  currentLine = '';
}
