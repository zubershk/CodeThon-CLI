import chalk from 'chalk';

type AgentName = 'PM' | 'Architect' | 'Debug' | 'Build' | 'Deploy' | 'Launch' | 'Research' | 'Doctor' | 'Code';

const AGENT_COLORS: Record<AgentName, (s: string) => string> = {
  PM: chalk.greenBright,
  Architect: chalk.magentaBright,
  Debug: chalk.yellowBright,
  Build: chalk.cyanBright,
  Deploy: chalk.blueBright,
  Launch: chalk.magenta,
  Research: chalk.whiteBright,
  Doctor: chalk.redBright,
  Code: chalk.cyan,
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
  currentLine = `  ${tag} ${chalk.whiteBright(action)}`;
  isActive = true;
  process.stdout.write(currentLine);
}

export function updateAgent(action: string): void {
  if (!isActive) return;
  clearLine();
  const match = currentLine.match(/\[(\w+) Agent\]/);
  if (match) {
    const agent = match[1] as AgentName;
    const colorize = AGENT_COLORS[agent] || chalk.whiteBright;
    const tag = colorize(`[${agent} Agent]`);
    currentLine = `  ${tag} ${chalk.whiteBright(action)}`;
    process.stdout.write(currentLine);
  }
}

export function succeedAgent(message?: string): void {
  if (!isActive) return;
  clearLine();
  const match = currentLine.match(/\[(\w+) Agent\]/);
  const agent = match?.[1] as AgentName | undefined;
  const tag = agent ? AGENT_COLORS[agent](`[${agent} Agent]`) : chalk.green('[Agent]');
  const msg = message ? chalk.greenBright(`✔ ${message}`) : chalk.greenBright('✔ Done');
  console.log(`  ${tag} ${msg}`);
  isActive = false;
  currentLine = '';
}

export function failAgent(message?: string): void {
  if (!isActive) return;
  clearLine();
  const match = currentLine.match(/\[(\w+) Agent\]/);
  const agent = match?.[1] as AgentName | undefined;
  const tag = agent ? AGENT_COLORS[agent](`[${agent} Agent]`) : chalk.red('[Agent]');
  const msg = message ? chalk.redBright(`✖ ${message}`) : chalk.redBright('✖ Failed');
  console.log(`  ${tag} ${msg}`);
  isActive = false;
  currentLine = '';
}
