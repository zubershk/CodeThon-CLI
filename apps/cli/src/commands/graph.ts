import fs from 'fs';
import path from 'path';
import type { CommandResult } from '@codethon/shared-types';
import { ProjectAnalyzer } from '../agents/project-analyzer';
import { renderRepositoryGraph } from '../ui/supernova';
import type { RepositoryGraphSummary } from '../ui/supernova';

const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.turbo', 'out']);

function walk(dir: string, root: string, depth = 5): string[] {
  if (depth <= 0) return [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full, root, depth - 1));
    else files.push(path.relative(root, full).replace(/\\/g, '/'));
  }
  return files;
}

function readDependencies(root: string): string[] {
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath)) return [];
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    return [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ].sort();
  } catch {
    return [];
  }
}

export async function buildRepositoryGraph(root = process.cwd()): Promise<RepositoryGraphSummary> {
  const analyzer = new ProjectAnalyzer();
  const keyFiles = await analyzer.readKeyFiles(root);
  const files = walk(root, root);

  const routes = files.filter(file =>
    /^(app|pages|src\/pages)\//.test(file) &&
    /\.(tsx|jsx|ts|js)$/.test(file) &&
    !/api\//.test(file),
  );
  const apiRoutes = files.filter(file => /(^app\/api\/|^pages\/api\/|\/routes\/|\/api\/).*\.(ts|js|tsx|jsx)$/.test(file));
  const components = files.filter(file => /(^components\/|\/components\/|^src\/components\/).*\.(tsx|jsx|ts|js)$/.test(file));
  const services = files.filter(file => /(service|client|provider|adapter|repository|lib|utils).*\.(ts|js)$/.test(file));
  const dataFiles = files.filter(file => /(prisma|schema|migration|supabase|drizzle|database|db).*\.(ts|js|sql|prisma)$/.test(file));
  const entryPoints = files.filter(file => [
    'package.json',
    'app/page.tsx',
    'pages/index.tsx',
    'src/main.tsx',
    'src/index.ts',
    'index.html',
  ].includes(file));

  return {
    root,
    techStack: analyzer.detectTechStack(keyFiles),
    entryPoints,
    routes,
    apiRoutes,
    components,
    services,
    dataFiles,
    dependencies: readDependencies(root),
  };
}

export async function graphCommand(targetDir?: string): Promise<CommandResult> {
  const root = targetDir ? path.resolve(targetDir) : process.cwd();
  const graph = await buildRepositoryGraph(root);
  renderRepositoryGraph(graph);
  return { success: true, message: 'Repository graph displayed', data: graph as any };
}
