import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const CODETHON_DIR = path.join(process.cwd(), '.codethon');

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export type OutputType = 'roadmap' | 'architecture' | 'debug' | 'launch' | 'session' | 'health' | 'recovery';

const OUTPUT_DIRS: Record<OutputType, string> = {
  roadmap: 'planning',
  architecture: 'planning',
  debug: 'debug-reports',
  launch: 'launch-assets',
  session: 'sessions',
  health: 'reports',
  recovery: 'reports',
};

export function saveOutput(type: OutputType, content: string, filename?: string): string {
  ensureDir(CODETHON_DIR);
  const subdir = OUTPUT_DIRS[type];
  const dir = path.join(CODETHON_DIR, subdir);
  ensureDir(dir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const name = filename || `${type}-${timestamp}`;
  const filePath = path.join(dir, `${name}.md`);

  const frontmatter = `---
type: ${type}
generated: ${new Date().toISOString()}
---

`;

  fs.writeFileSync(filePath, frontmatter + content, 'utf-8');
  return filePath;
}

export function saveSessionLog(messages: { role: string; content: string }[]): string {
  ensureDir(CODETHON_DIR);
  const sessionsDir = path.join(CODETHON_DIR, 'sessions');
  ensureDir(sessionsDir);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filePath = path.join(sessionsDir, `session-${timestamp}.md`);

  const content = messages.map(m => `## ${m.role.toUpperCase()}\n\n${m.content}\n`).join('---\n');
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export function listSavedOutputs(): { type: OutputType; files: string[] }[] {
  ensureDir(CODETHON_DIR);
  const result: { type: OutputType; files: string[] }[] = [];

  for (const [type, subdir] of Object.entries(OUTPUT_DIRS)) {
    const dir = path.join(CODETHON_DIR, subdir);
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
      if (files.length > 0) {
        result.push({ type: type as OutputType, files: files.slice(-5).reverse() });
      }
    }
  }

  return result;
}

export function printSavedOutputsSummary(): void {
  const outputs = listSavedOutputs();
  if (outputs.length === 0) {
    console.log(`  ${chalk.dim('No saved outputs in .codethon/')}`);
    return;
  }
  console.log(`  ${chalk.bold.whiteBright('Saved Outputs')}`);
  for (const { type, files } of outputs) {
    console.log(`  ${chalk.cyanBright('\u25B8')} ${chalk.whiteBright(type)}/`);
    for (const f of files) {
      console.log(`    ${chalk.gray('\u2514\u2500')} ${chalk.dim(f)}`);
    }
  }
}
