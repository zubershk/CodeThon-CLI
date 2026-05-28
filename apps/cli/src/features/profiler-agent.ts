import fs from 'fs';
import path from 'path';

export interface PerformanceFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'n-plus-one' | 'unoptimized-render' | 'memory-leak' | 'dead-code' | 'bundle-size' | 'inefficient-query' | 'unused-dependency';
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface CodeSmellFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'long-function' | 'duplicate-code' | 'high-complexity' | 'god-object' | 'feature-envy' | 'deep-nesting' | 'magic-number' | 'todo-comment';
  file: string;
  line: number;
  message: string;
  metric?: { value: number; threshold: number };
}

export class ProfilerAgent {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  async analyze(): Promise<(PerformanceFinding | CodeSmellFinding)[]> {
    const findings: (PerformanceFinding | CodeSmellFinding)[] = [];
    const files = this.getSourceFiles();

    for (const file of files.slice(0, 50)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        findings.push(...this.checkFile(findings.length, file, content));
        findings.push(...this.checkCodeSmells(file, content));
      } catch { /* skip unreadable files */ }
    }

    this.checkUnusedDependencies(findings as PerformanceFinding[]);
    this.checkBundleSize(findings as PerformanceFinding[]);

    return findings;
  }

  private checkFile(count: number, file: string, content: string): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];
    const relFile = path.relative(this.projectRoot, file);

    // N+1 queries in Prisma/TypeORM
    const nPlusOnePatterns = [
      /\.findMany\([^)]*\)[\s\S]{0,200}\.map\(/g,
      /for\s*\(\s*(const|let|var)\s+\w+\s+of\s+\w+\.\w+\s*\)[\s\S]{0,200}\.find(First|Many)\(/g,
    ];
    for (const pattern of nPlusOnePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        findings.push({
          severity: 'high',
          category: 'n-plus-one',
          file: relFile,
          message: 'Potential N+1 query detected. Consider using eager loading or batch queries.',
          suggestion: 'Use `include` or `select` in the parent query, or use DataLoader for batching.',
        });
      }
    }

    // Unoptimized React renders
    if (/React|useState/.test(content) && file.endsWith('.tsx')) {
      if (!/React\.memo|useMemo|useCallback/.test(content)) {
        const componentMatch = content.match(/export\s+(default\s+)?function\s+(\w+)/);
        if (componentMatch) {
          findings.push({
            severity: 'medium',
            category: 'unoptimized-render',
            file: relFile,
            message: `Component "${componentMatch[2]}" lacks React.memo, useMemo, or useCallback.`,
            suggestion: 'Wrap with React.memo or memoize expensive computations with useMemo.',
          });
        }
      }
    }

    // Memory leaks - event listeners not removed
    if (/addEventListener|on\s*$/.test(content)) {
      if (!/removeEventListener|cleanup|useEffect\s*\([^)]*return/.test(content)) {
        findings.push({
          severity: 'high',
          category: 'memory-leak',
          file: relFile,
          message: 'Event listener added but may not be cleaned up.',
          suggestion: 'Add cleanup in useEffect return or removeEventListener on component unmount.',
        });
      }
    }

    // Inefficient array operations
    if (content.includes('.filter(') && content.includes('.find(')) {
      if (content.match(/\.filter\([^)]+\)\s*\[0\]/)) {
        findings.push({
          severity: 'medium',
          category: 'inefficient-query',
          file: relFile,
          message: 'Using .filter()[0] instead of .find(). .find() stops at first match.',
          suggestion: 'Replace .filter(...)[0] with .find(...) for better performance.',
        });
      }
    }

    // Very large files
    const lineCount = content.split('\n').length;
    if (lineCount > 400) {
      findings.push({
        severity: 'low',
        category: 'dead-code',
        file: relFile,
        message: `File is ${lineCount} lines. Consider splitting into smaller modules.`,
        suggestion: 'Break into modules of <200 lines each.',
      });
    }

    return findings;
  }

  private checkCodeSmells(file: string, content: string): CodeSmellFinding[] {
    const findings: CodeSmellFinding[] = [];
    const relFile = path.relative(this.projectRoot, file);
    const lines = content.split('\n');

    // Long functions
    let inFunction = false;
    let funcName = '';
    let funcStart = 0;
    let braceCount = 0;
    let funcLines = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect function start
      const funcMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)|(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*{/);
      if (funcMatch && !inFunction) {
        inFunction = true;
        funcName = funcMatch[1] || funcMatch[2] || 'anonymous';
        funcStart = i;
        braceCount = 1;
        funcLines = 1;
        continue;
      }

      if (inFunction) {
        funcLines++;
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        braceCount += openBraces - closeBraces;

        if (braceCount <= 0) {
          inFunction = false;
          if (funcLines > 60) {
            findings.push({
              severity: funcLines > 120 ? 'high' : 'medium',
              category: 'long-function',
              file: relFile,
              line: funcStart + 1,
              message: `Function "${funcName}" is ${funcLines} lines (threshold: 60).`,
              metric: { value: funcLines, threshold: 60 },
            });
          }
        }
      }
    }

    // Deep nesting
    let maxDepth = 0;
    let currentDepth = 0;
    let deepLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.includes('{')) currentDepth++;
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
        deepLine = i;
      }
      if (trimmed.includes('}')) currentDepth = Math.max(0, currentDepth - 1);
    }
    if (maxDepth > 6) {
      findings.push({
        severity: maxDepth > 8 ? 'high' : 'medium',
        category: 'deep-nesting',
        file: relFile,
        line: deepLine + 1,
        message: `Nesting depth of ${maxDepth} levels (threshold: 6).`,
        metric: { value: maxDepth, threshold: 6 },
      });
    }

    // Magic numbers
    const magicNumRegex = /[^a-zA-Z0-9](\d{4,})(?![a-zA-Z%])/g;
    let magicMatch: RegExpExecArray | null;
    while ((magicMatch = magicNumRegex.exec(content)) !== null) {
      const lineNum = content.slice(0, magicMatch.index).split('\n').length;
      findings.push({
        severity: 'low',
        category: 'magic-number',
        file: relFile,
        line: lineNum,
        message: `Magic number ${magicMatch[1]}. Consider extracting to a named constant.`,
      });
    }

    // TODO/FIXME comments
    const todoRegex = /\/\/\s*(TODO|FIXME|HACK|XXX)/g;
    let todoMatch: RegExpExecArray | null;
    while ((todoMatch = todoRegex.exec(content)) !== null) {
      const lineNum = content.slice(0, todoMatch.index).split('\n').length;
      findings.push({
        severity: 'info',
        category: 'todo-comment',
        file: relFile,
        line: lineNum,
        message: `${todoMatch[1]} comment found.`,
      });
    }

    // Cyclomatic complexity (rough estimate)
    const complexityKeywords = (content.match(/\b(if|else if|for|while|case |catch|\|\||&&)\b/g) || []).length;
    if (complexityKeywords > 20) {
      const match2 = content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
      const fnName = match2 ? match2[1] : 'module';
      findings.push({
        severity: complexityKeywords > 30 ? 'high' : 'medium',
        category: 'high-complexity',
        file: relFile,
        line: 1,
        message: `High cyclomatic complexity (~${complexityKeywords} decision points) in "${fnName}".`,
        metric: { value: complexityKeywords, threshold: 20 },
      });
    }

    return findings;
  }

  private checkUnusedDependencies(findings: PerformanceFinding[]): void {
    const pkgPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const sourceFiles = this.getSourceFiles();
      const allSourceCode = sourceFiles.map(f => {
        try { return fs.readFileSync(f, 'utf-8'); } catch { return ''; }
      }).join('\n');

      for (const [dep] of Object.entries(allDeps)) {
        const depName = dep as string;
        const importPattern = new RegExp(`(from ['"\`]${depName}|require\\(['"\`]${depName}|import\\s+['"\`]${depName})`);
        if (!importPattern.test(allSourceCode)) {
          const configFiles = ['next.config', 'vite.config', 'webpack.config', 'tailwind.config', '.eslintrc'];
          const isConfigDep = configFiles.some(cf => depName.includes(cf.replace('.config', '')));
          if (!isConfigDep && !['typescript', '@types/node', '@types/react'].includes(depName)) {
            findings.push({
              severity: 'low',
              category: 'unused-dependency',
              file: 'package.json',
              message: `"${depName}" may be unused.`,
              suggestion: `Run 'npm uninstall ${depName}' to remove it.`,
            });
          }
        }
      }
    } catch { /* skip */ }
  }

  private checkBundleSize(findings: PerformanceFinding[]): void {
    const pkgPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const heavyDeps = ['moment', 'lodash', 'jquery', 'bootstrap', 'chart.js'];

      for (const dep of Object.keys(allDeps)) {
        if (heavyDeps.includes(dep)) {
          findings.push({
            severity: 'medium',
            category: 'bundle-size',
            file: 'package.json',
            message: `"${dep}" is heavy. Consider a lighter alternative.`,
            suggestion: dep === 'moment'
              ? 'Replace with date-fns or dayjs (90% smaller).'
              : dep === 'lodash'
                ? 'Import only specific functions: import debounce from "lodash/debounce".'
                : dep === 'jquery'
                  ? 'Modern vanilla JS APIs (querySelector, fetch) make jQuery unnecessary.'
                  : `Consider if "${dep}" is needed.`,
          });
        }
      }
    } catch { /* skip */ }
  }

  private getSourceFiles(): string[] {
    return this.walkDir(path.join(this.projectRoot, 'src'));
  }

  private walkDir(dir: string): string[] {
    const files: string[] = [];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
            files.push(...this.walkDir(fullPath));
          }
        } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch { /* skip */ }
    return files;
  }

  generateReport(findings: (PerformanceFinding | CodeSmellFinding)[]): string {
    if (findings.length === 0) return 'No issues found.';

    const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
    const sorted = [...findings].sort(
      (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
    );

    const lines: string[] = [];
    lines.push(`Found ${findings.length} issue${findings.length !== 1 ? 's' : ''}:`);
    lines.push('');

    const byFile = new Map<string, (PerformanceFinding | CodeSmellFinding)[]>();
    for (const f of sorted) {
      const existing = byFile.get(f.file) || [];
      existing.push(f);
      byFile.set(f.file, existing);
    }

    for (const [file, issues] of byFile) {
      lines.push(`  ${file}:`);
      for (const issue of issues) {
        const sevIcon = { critical: '!!', high: '!', medium: '*', low: '-', info: '?' }[issue.severity] || ' ';
        lines.push(`    ${sevIcon} ${issue.message}`);
        if ('suggestion' in issue && issue.suggestion) {
          lines.push(`       ${(issue as PerformanceFinding).suggestion}`);
        }
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
