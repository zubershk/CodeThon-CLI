import fs from 'fs';
import path from 'path';
import { BaseAgent } from './base-agent';

export interface FileNode {
  path: string;
  size: number;
  isDir: boolean;
  children?: FileNode[];
}

export interface AnalysisIssue {
  severity: 'critical' | 'warning' | 'info';
  file?: string;
  message: string;
  suggestion?: string;
}

export interface ProjectAnalysis {
  name: string;
  techStack: string[];
  entryPoints: string[];
  missingFiles: string[];
  issues: AnalysisIssue[];
  structure: FileNode[];
  summary: string;
}

export interface ProjectAnalysisCallbacks {
  onProgress?: (message: string) => void;
  onSummaryStart?: () => void;
  onSummaryToken?: (token: string) => void;
}

export class ProjectAnalyzer extends BaseAgent {
  private static readonly ANALYSIS_PROMPT = `You are a senior software engineer analyzing a project.
Your job is to:
1. Scan the file tree to understand the project structure
2. Identify the tech stack (frameworks, libraries, languages)
3. Find missing critical files (config files that should exist)
4. Spot issues (broken imports, missing dependencies, outdated configs)
5. Generate a clear summary of what's built and what needs to be built

Be precise and actionable.`;

  constructor() {
    super(ProjectAnalyzer.ANALYSIS_PROMPT);
  }

  async scanDirectory(dirPath: string, depth = 3): Promise<FileNode[]> {
    if (depth <= 0) return [];

    const skipDirs = new Set([
      // Dependencies & packages
      'node_modules', '.pnpm', '.yarn', '.npm',
      // Version control
      '.git', '.svn', '.hg',
      // Build output
      'dist', 'build', 'out', '.next', '.nuxt', '.output',
      'target', 'bin', 'obj',
      // Virtual envs & caches
      '.venv', 'venv', 'env', '.env', '__pycache__', '.cache',
      '.pytest_cache', '.mypy_cache', '.ruff_cache',
      // Coverage & reports
      'coverage', '.nyc_output',
      // Monorepo tooling
      '.turbo', '.nx', '.lazy',
      // IDE & OS
      '.vscode', '.idea', '.vs',
    ]);
    const skipFiles = new Set([
      '.DS_Store', 'Thumbs.db', 'desktop.ini',
      'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'npm-shrinkwrap.json', 'bun.lockb', 'bun.lock',
      '.npmrc', '.yarnrc', '.yarnrc.yml',
      'tsconfig.tsbuildinfo',
    ]);

    const results: FileNode[] = [];

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (skipDirs.has(entry.name) || skipFiles.has(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const children = await this.scanDirectory(fullPath, depth - 1);
          results.push({ path: fullPath, size: 0, isDir: true, children });
        } else {
          const stat = fs.statSync(fullPath);
          results.push({ path: fullPath, size: stat.size, isDir: false });
        }
      }
    } catch {
      // permission denied, skip
    }

    return results;
  }

  async readKeyFiles(dirPath: string): Promise<Map<string, string>> {
    const keyFiles = new Map<string, string>();
    const candidates = [
      'package.json', 'tsconfig.json', 'next.config.js', 'next.config.ts',
      'next.config.mjs', 'vite.config.ts', 'vite.config.js',
      'astro.config.mjs', 'svelte.config.js', 'nuxt.config.ts',
      'tailwind.config.ts', 'tailwind.config.js', 'postcss.config.js',
      '.env', '.env.local', '.env.example', 'docker-compose.yml',
      'Dockerfile', 'Makefile', 'Cargo.toml', 'go.mod',
      'requirements.txt', 'Pipfile', 'pyproject.toml',
      'index.html', 'src/main.tsx', 'src/App.tsx', 'app/page.tsx',
      'src/index.ts', 'src/index.tsx', 'pages/index.tsx',
    ];

    for (const candidate of candidates) {
      const fullPath = path.join(dirPath, candidate);
      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8').slice(0, 5000);
          keyFiles.set(candidate, content);
        } catch {
          // binary file, skip
        }
      }
    }

    return keyFiles;
  }

  async analyze(dirPath: string, callbacks: ProjectAnalysisCallbacks = {}): Promise<ProjectAnalysis> {
    const name = path.basename(dirPath);
    callbacks.onProgress?.(`Scanning file tree in ${name}`);
    const structure = await this.scanDirectory(dirPath);

    callbacks.onProgress?.(`Reading config and entry files`);
    const keyFiles = await this.readKeyFiles(dirPath);

    callbacks.onProgress?.('Detecting stack, entry points, and missing files');
    const techStack = this.detectTechStack(keyFiles);
    const entryPoints = this.findEntryPoints(keyFiles);
    const missingFiles = this.findMissingFiles(techStack, keyFiles);

    callbacks.onProgress?.('Running static project checks');
    const issues: AnalysisIssue[] = this.staticAnalysis(keyFiles);

    let summary = '';
    try {
      callbacks.onProgress?.('Generating AI project summary');
      const context = JSON.stringify({
        structure: structure.map(s => s.path.slice(dirPath.length + 1)),
        techStack,
        entryPoints,
        missingFiles,
        keyFiles: [...keyFiles.keys()],
      });
      if (callbacks.onSummaryToken) {
        callbacks.onSummaryStart?.();
        summary = await this.runStream('analyze', callbacks.onSummaryToken, context);
      } else {
        const result = await this.run('analyze', context);
        summary = result.details;
      }
    } catch {
      summary = `Project "${name}" with ${techStack.join(', ')}. ${keyFiles.size} key files found.`;
    }

    return { name, techStack, entryPoints, missingFiles, issues, structure, summary };
  }

  detectTechStack(keyFiles: Map<string, string>): string[] {
    const stack: string[] = [];
    if (!keyFiles.has('package.json')) return stack;

    const pkg = keyFiles.get('package.json')!;
    if (pkg.includes('"next"')) stack.push('Next.js');
    if (pkg.includes('"react"')) stack.push('React');
    if (pkg.includes('"vue"')) stack.push('Vue');
    if (pkg.includes('"@angular/core"')) stack.push('Angular');
    if (pkg.includes('"tailwindcss"')) stack.push('Tailwind CSS');
    if (pkg.includes('"typescript"')) stack.push('TypeScript');
    if (pkg.includes('"express"') || pkg.includes('"@nestjs/core"')) stack.push('Node.js Backend');
    if (pkg.includes('"prisma"') || pkg.includes('"drizzle"')) stack.push('ORM');
    if (stack.length === 0) stack.push('Node.js');

    if (keyFiles.has('Cargo.toml')) stack.push('Rust');
    if (keyFiles.has('go.mod')) stack.push('Go');
    if (keyFiles.has('requirements.txt') || keyFiles.has('pyproject.toml')) stack.push('Python');
    if (keyFiles.has('Dockerfile')) stack.push('Docker');

    return stack;
  }

  private findEntryPoints(keyFiles: Map<string, string>): string[] {
    const entries: string[] = [];
    for (const key of ['package.json', 'src/main.tsx', 'app/page.tsx', 'src/index.ts', 'index.html', 'pages/index.tsx']) {
      if (keyFiles.has(key)) entries.push(key);
    }
    return entries;
  }

  private findMissingFiles(techStack: string[], keyFiles: Map<string, string>): string[] {
    const missing: string[] = [];
    const expectedConfigs: Record<string, string[]> = {
      'package.json': ['tsconfig.json'],
      'React': ['.env.example'],
      'Next.js': ['next.config.js', 'next.config.ts', 'next.config.mjs'],
      'Tailwind CSS': ['tailwind.config.ts', 'tailwind.config.js', 'postcss.config.js'],
    };

    for (const [trigger, expected] of Object.entries(expectedConfigs)) {
      if (trigger === 'package.json' || techStack.some(t => t.includes(trigger))) {
        for (const exp of expected) {
          if (!keyFiles.has(exp)) missing.push(exp);
        }
      }
    }

    return missing;
  }

  private staticAnalysis(keyFiles: Map<string, string>): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    if (keyFiles.has('package.json')) {
      const pkg = keyFiles.get('package.json')!;
      if (!pkg.includes('"scripts"')) {
        issues.push({
          severity: 'warning',
          file: 'package.json',
          message: 'No scripts section defined',
          suggestion: 'Add start, build, dev scripts',
        });
      }
    }

    if (keyFiles.has('.env') && !keyFiles.has('.env.example')) {
      issues.push({
        severity: 'info',
        message: '.env found but no .env.example for documentation',
        suggestion: 'Create .env.example with keys only (no values)',
      });
    }

    return issues;
  }
}
