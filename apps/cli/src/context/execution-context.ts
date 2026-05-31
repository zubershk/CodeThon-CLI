import { spawnSync } from 'child_process';
import path from 'path';
import type { FileNode } from '../agents/project-analyzer';
import { ProjectAnalyzer } from '../agents/project-analyzer';
import { StateManager } from '../cil/state-manager';
import { stripAnsi, truncateText } from '../ui/terminal-text';

export interface ExecutionContextSnapshot {
  generatedAt: string;
  root: string;
  projectName: string;
  goal: string;
  techStack: string[];
  keyFiles: string[];
  candidateFiles: string[];
  changedFiles: string[];
  scripts: string[];
  dependencies: string[];
  memoryEntries: string[];
  tokenEstimate: number;
  contextPercent: number;
  summary: string;
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'make', 'build',
  'create', 'update', 'fix', 'add', 'into', 'file', 'project', 'now',
  'please', 'using', 'use', 'need', 'want', 'all',
]);

const SECRET_FILE_RE = /(^|\/)\.env($|\.|\/)|secret|credential|token/i;

export async function buildExecutionContextSnapshot(goal: string, root = process.cwd()): Promise<ExecutionContextSnapshot> {
  const analyzer = new ProjectAnalyzer();
  const generatedAt = new Date().toISOString();
  let keyFiles = new Map<string, string>();
  let structure: FileNode[] = [];
  let techStack: string[] = [];

  try {
    keyFiles = await analyzer.readKeyFiles(root);
    structure = await analyzer.scanDirectory(root, 4);
    techStack = analyzer.detectTechStack(keyFiles);
  } catch {
    // Context building must never block execution.
  }

  const files = flattenFiles(structure, root);
  const changedFiles = readGitStatus(root);
  const packageInfo = readPackageInfo(keyFiles.get('package.json'));
  const candidateFiles = rankCandidateFiles(goal, files, changedFiles, Array.from(keyFiles.keys()));
  const memoryEntries = readMemoryEntries(goal);
  const tokenEstimate = estimateTokens(goal, candidateFiles, memoryEntries, packageInfo.scripts, techStack);
  const contextPercent = Math.min(100, Math.round((tokenEstimate / 128000) * 100));
  const projectName = path.basename(root);

  return {
    generatedAt,
    root,
    projectName,
    goal,
    techStack,
    keyFiles: Array.from(keyFiles.keys()).filter(name => !SECRET_FILE_RE.test(name)),
    candidateFiles,
    changedFiles,
    scripts: packageInfo.scripts,
    dependencies: packageInfo.dependencies,
    memoryEntries,
    tokenEstimate,
    contextPercent,
    summary: summarizeSnapshot(projectName, techStack, candidateFiles, changedFiles, memoryEntries),
  };
}

export function formatExecutionContextForPrompt(snapshot: ExecutionContextSnapshot): string {
  return [
    '## Execution Context Snapshot',
    `Generated: ${snapshot.generatedAt}`,
    `Repository: ${snapshot.root}`,
    `Detected Stack: ${snapshot.techStack.join(', ') || 'Unknown'}`,
    `Estimated Context Use: ${snapshot.contextPercent}% (${snapshot.tokenEstimate.toLocaleString()} tokens)`,
    '',
    '### Task-Relevant Files',
    ...listOrNone(snapshot.candidateFiles, 18),
    '',
    '### Changed Files',
    ...listOrNone(snapshot.changedFiles, 14),
    '',
    '### Package Scripts',
    ...listOrNone(snapshot.scripts, 12),
    '',
    '### Key Config Files',
    ...listOrNone(snapshot.keyFiles, 14),
    '',
    '### Project Memory',
    ...listOrNone(snapshot.memoryEntries, 10),
    '',
    'Instruction: use this snapshot as orientation. Read actual files before editing them. Do not assume file contents from filenames alone.',
  ].join('\n');
}

function flattenFiles(nodes: FileNode[], root: string): string[] {
  const files: string[] = [];
  const visit = (node: FileNode) => {
    const rel = path.relative(root, node.path).replace(/\\/g, '/');
    if (node.isDir) {
      for (const child of node.children || []) visit(child);
      return;
    }
    if (!rel || SECRET_FILE_RE.test(rel)) return;
    files.push(rel);
  };
  for (const node of nodes) visit(node);
  return files.sort();
}

function readGitStatus(root: string): string[] {
  try {
    const result = spawnSync('git', ['status', '--short'], {
      cwd: root,
      encoding: 'utf-8',
      shell: process.platform === 'win32',
      timeout: 3000,
      windowsHide: true,
    });
    if (result.status !== 0 || !result.stdout) return [];
    return result.stdout
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => line.replace(/^..?\s+/, '').replace(/\\/g, '/'))
      .filter(file => file && !SECRET_FILE_RE.test(file))
      .slice(0, 40);
  } catch {
    return [];
  }
}

function readPackageInfo(pkg?: string): { scripts: string[]; dependencies: string[] } {
  if (!pkg) return { scripts: [], dependencies: [] };
  try {
    const parsed = JSON.parse(pkg);
    const scripts = Object.entries(parsed.scripts || {})
      .map(([name, command]) => `${name}: ${String(command)}`)
      .slice(0, 20);
    const dependencies = [
      ...Object.keys(parsed.dependencies || {}),
      ...Object.keys(parsed.devDependencies || {}),
    ].sort().slice(0, 50);
    return { scripts, dependencies };
  } catch {
    return { scripts: [], dependencies: [] };
  }
}

function rankCandidateFiles(goal: string, files: string[], changedFiles: string[], keyFiles: string[]): string[] {
  const tokens = goalTokens(goal);
  const important = new Set([
    'package.json',
    'tsconfig.json',
    'app/page.tsx',
    'pages/index.tsx',
    'src/main.tsx',
    'src/App.tsx',
    'README.md',
  ]);

  const scored = files.map(file => {
    const lower = file.toLowerCase();
    let score = 0;
    if (changedFiles.includes(file)) score += 80;
    if (important.has(file)) score += 45;
    if (keyFiles.includes(file)) score += 30;
    for (const token of tokens) {
      if (lower.includes(token)) score += 18;
    }
    if (/auth|login|session|user|account|dashboard|api|route|server|db|schema|prisma|supabase|readme|test|spec|config/.test(lower)) score += 12;
    if (/\.(ts|tsx|js|jsx|json|md|css|sql|prisma)$/.test(lower)) score += 4;
    return { file, score };
  });

  const chosen = scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file))
    .map(item => item.file);

  return Array.from(new Set([...changedFiles, ...chosen, ...keyFiles.filter(file => !SECRET_FILE_RE.test(file))]))
    .slice(0, 28);
}

function readMemoryEntries(goal: string): string[] {
  const project = new StateManager().getProject();
  const nodes = Array.isArray(project?.memoryGraph) ? project!.memoryGraph : [];
  if (nodes.length === 0) return [];
  const tokens = goalTokens(goal);
  return nodes
    .map((node: any) => {
      const text = `${node.type || 'memory'}: ${node.content || ''}`;
      const lower = text.toLowerCase();
      const score = tokens.reduce((sum, token) => sum + (lower.includes(token) ? 1 : 0), 0);
      return { text: truncateText(stripAnsi(text).replace(/\s+/g, ' '), 180), score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(item => item.text);
}

function goalTokens(goal: string): string[] {
  return Array.from(new Set(
    goal
      .toLowerCase()
      .replace(/[^a-z0-9_\-\s/.]/g, ' ')
      .split(/\s+/)
      .map(token => token.replace(/^\/+|\/+$/g, ''))
      .filter(token => token.length > 2 && !STOP_WORDS.has(token))
      .slice(0, 24),
  ));
}

function estimateTokens(
  goal: string,
  files: string[],
  memory: string[],
  scripts: string[],
  techStack: string[],
): number {
  return Math.max(1, Math.round(goal.length / 4))
    + files.length * 180
    + memory.join(' ').length / 4
    + scripts.join(' ').length / 4
    + techStack.join(' ').length / 4;
}

function summarizeSnapshot(
  projectName: string,
  techStack: string[],
  candidateFiles: string[],
  changedFiles: string[],
  memoryEntries: string[],
): string {
  return [
    `${projectName}: ${techStack.join(', ') || 'Unknown stack'}`,
    `${candidateFiles.length} task-relevant files selected`,
    `${changedFiles.length} git-changed files detected`,
    `${memoryEntries.length} memory entries available`,
  ].join(' · ');
}

function listOrNone(items: string[], limit: number): string[] {
  if (items.length === 0) return ['- none'];
  return items.slice(0, limit).map(item => `- ${item}`);
}
