import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { LLMRouter } from '../llm/index';
import { sanitizeEnv, resolveBin } from '../utils/env';

export interface TestGenerationResult {
  file: string;
  content: string;
  framework: string;
}

export interface TestCoverageReport {
  totalLines: number;
  coveredLines: number;
  percentage: number;
  uncoveredFiles: string[];
}

export class TestAgent {
  private projectRoot: string;
  private router: LLMRouter;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.router = new LLMRouter();
  }

  detectFramework(): string {
    const pkgPath = path.join(this.projectRoot, 'package.json');
    if (!fs.existsSync(pkgPath)) return 'unknown';

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps.vitest) return 'vitest';
    if (deps.jest) return 'jest';
    if (deps.playwright) return 'playwright';
    if (deps.cypress) return 'cypress';
    if (deps.mocha) return 'mocha';
    if (deps.ava) return 'ava';
    return 'unknown';
  }

  async generateTests(sourceFile: string): Promise<TestGenerationResult | null> {
    const fullPath = path.resolve(this.projectRoot, sourceFile);
    if (!fs.existsSync(fullPath)) return null;

    const content = fs.readFileSync(fullPath, 'utf-8');
    const framework = this.detectFramework();
    const ext = path.extname(sourceFile);
    const baseName = path.basename(sourceFile, ext);
    const testExt = framework === 'vitest' || framework === 'jest' ? '.test.ts' : '.test.js';
    const testFile = path.join(
      path.dirname(sourceFile),
      `${baseName}${testExt}`
    );

    const frameworkExamples: Record<string, string> = {
      vitest: `import { describe, it, expect } from 'vitest';`,
      jest: `import { describe, it, expect } from '@jest/globals';`,
      playwright: `import { test, expect } from '@playwright/test';`,
      cypress: `describe('', () => { it('', () => {}) })`,
      mocha: `const { describe, it } = require('mocha'); const assert = require('assert');`,
      ava: `import test from 'ava';`,
    };

    const frameworkImport = frameworkExamples[framework] || '';

    const prompt = `Generate tests for this ${ext.slice(1)} file using ${framework}:

\`\`\`${ext.slice(1)}
${content.slice(0, 4000)}
\`\`\`

Framework: ${framework}
Import style: ${frameworkImport}

Generate ONLY the test file content. No explanation.
Use proper describe/it blocks. Cover:
- Normal cases
- Edge cases
- Error handling
- Key exports/functions`;

    try {
      const result = await this.router.callWithFallback(prompt, 'code-generation');

      let testContent = result.response
        .replace(/```\w*\s*/g, '')
        .replace(/```/g, '')
        .trim();

      if (frameworkImport && !testContent.includes(frameworkImport)) {
        testContent = `${frameworkImport}\n\n${testContent}`;
      }

      return { file: testFile, content: testContent, framework };
    } catch (err) {
      return null;
    }
  }

  async generateAllTests(sourceDir: string): Promise<TestGenerationResult[]> {
    const results: TestGenerationResult[] = [];
    const files = this.findSourceFiles(sourceDir);

    for (const file of files) {
      const testPath = file.replace(/\.(ts|tsx|js|jsx)$/, '.test.$1');
      const fullPath = path.join(this.projectRoot, testPath);

      if (fs.existsSync(fullPath)) continue;

      const result = await this.generateTests(file);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  async runMutationTests(): Promise<{ passed: number; killed: number; total: number }> {
    const framework = this.detectFramework();
    if (framework !== 'vitest' && framework !== 'jest') {
      return { passed: 0, killed: 0, total: 0 };
    }

    let passed = 0;
    let killed = 0;
    const total = 5;

    const testFiles = this.findTestFiles();
    if (testFiles.length === 0) return { passed: 0, killed: 0, total: 0 };

    const firstTest = testFiles[0];
    const testContent = fs.readFileSync(fullPath(firstTest), 'utf-8');

    const mutations = [
      { name: 'flip-boolean', apply: (code: string) => code.replace(/===/g, '!==').replace(/!==/g, '===') },
      { name: 'remove-null-check', apply: (code: string) => code.replace(/\s*\?\s*/g, ' ') },
      { name: 'change-threshold', apply: (code: string) => code.replace(/>=/g, '>').replace(/<=/g, '<') },
      { name: 'swap-ternary', apply: (code: string) => code.replace(/(\w+)\s*\?\s*(\w+)\s*:\s*(\w+)/g, '$1 ? $3 : $2') },
      { name: 'remove-catch', apply: (code: string) => code.replace(/catch\s*\([^)]*\)\s*\{[^}]*\}/g, 'catch(e) { throw e }') },
    ];

    for (let i = 0; i < Math.min(total, mutations.length); i++) {
      const mutation = mutations[i];
      const mutated = mutation.apply(testContent);

      const mutatedPath = firstTest.replace(/\.(test\.|spec\.)/, '.mutated.$1');
      fs.writeFileSync(fullPath(mutatedPath), mutated, 'utf-8');

      const result = spawnSync(resolveBin('npx'), [framework, 'run', mutatedPath], {
        cwd: this.projectRoot,
        stdio: 'pipe',
        encoding: 'utf-8',
        env: sanitizeEnv(),
      });

      if (result.status === 0) {
        passed++;
      } else {
        killed++;
      }

      try { fs.unlinkSync(fullPath(mutatedPath)); } catch { /* ignore */ }
    }

    return { passed, killed, total: Math.min(total, mutations.length) };

    function fullPath(file: string): string {
      return path.resolve(process.cwd(), file);
    }
  }

  async analyzeCoverage(): Promise<TestCoverageReport> {
    const framework = this.detectFramework();

    if (framework === 'vitest') {
      const result = spawnSync(resolveBin('npx'), ['vitest', 'run', '--coverage'], {
        cwd: this.projectRoot,
        stdio: 'pipe',
        encoding: 'utf-8',
        env: sanitizeEnv(),
      });

      const output = result.stdout || '';
      const linesMatch = output.match(/(\d+)\/(\d+)\s+lines/i);
      if (linesMatch) {
        return {
          totalLines: parseInt(linesMatch[2]),
          coveredLines: parseInt(linesMatch[1]),
          percentage: Math.round((parseInt(linesMatch[1]) / parseInt(linesMatch[2])) * 100),
          uncoveredFiles: [],
        };
      }
    }

    return { totalLines: 0, coveredLines: 0, percentage: 0, uncoveredFiles: [] };
  }

  private findSourceFiles(dir: string): string[] {
    const srcDir = path.join(this.projectRoot, dir);
    if (!fs.existsSync(srcDir)) return [];
    return this.walkDir(srcDir).filter(f =>
      /\.(ts|tsx|js|jsx)$/.test(f) &&
      !/\.(test|spec|mutated)\./.test(f) &&
      !f.includes('__tests__') &&
      !f.includes('node_modules')
    );
  }

  private findTestFiles(): string[] {
    return this.walkDir(this.projectRoot).filter(f =>
      /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f)
    );
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
        } else {
          files.push(fullPath);
        }
      }
    } catch { /* permission denied, skip */ }
    return files;
  }

  writeTests(results: TestGenerationResult[]): number {
    let count = 0;
    for (const result of results) {
      const fullPath$ = path.join(this.projectRoot, result.file);
      const dir = path.dirname(fullPath$);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath$, result.content, 'utf-8');
      count++;
    }
    return count;
  }
}
