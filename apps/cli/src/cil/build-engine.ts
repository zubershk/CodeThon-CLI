import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { createProvider } from '@codethon/llm-client';
import type { LLMProvider, LLMMessage, LLMResponse } from '@codethon/llm-client';
import { getLLMConfig } from '../utils/config';
import { ProjectAnalyzer } from '../agents/project-analyzer';
import type { ProjectAnalysis } from '../agents/project-analyzer';

export interface BuildStep {
  type: 'create' | 'modify' | 'delete' | 'install' | 'command';
  file?: string;
  description: string;
  code?: string;
  command?: string;
}

export interface BuildPlan {
  goal: string;
  steps: BuildStep[];
}

interface BuildAction {
  type: 'file' | 'shell';
  description: string;
  filePath?: string;
  content?: string;
  command?: string;
}

export class BuildEngine {
  private analyzer: ProjectAnalyzer;
  private provider: LLMProvider;
  private projectPath: string;

  constructor(projectPath: string) {
    this.analyzer = new ProjectAnalyzer();
    const config = getLLMConfig();
    this.provider = createProvider(config);
    this.projectPath = projectPath;
  }

  async analyzeProject(): Promise<ProjectAnalysis> {
    return this.analyzer.analyze(this.projectPath);
  }

  async build(goal: string, onToken?: (token: string) => void): Promise<{ filesWritten: number; commandsRun: number; errors: string[] }> {
    const analysis = await this.analyzeProject();
    let filesWritten = 0;
    let commandsRun = 0;
    const errors: string[] = [];

    const plan = await this.generatePlan(goal, analysis);
    onToken?.(`\n  ${chalk.bold.cyan('BUILD PLAN')}\n`);
    onToken?.(`  ${chalk.cyanBright('\u25B8')} ${plan.goal}\n\n`);

    for (const step of plan.steps) {
      onToken?.(`  ${chalk.yellowBright('\u25B8')} ${step.description}\n`);

      try {
        if ((step.type === 'create' || step.type === 'modify') && step.file && step.code) {
          await this.writeFile(step.file, step.code);
          filesWritten++;
          onToken?.(`    ${chalk.greenBright('\u2713')} ${step.file}\n`);
        } else if (step.type === 'command' && step.command) {
          execSync(step.command, { cwd: this.projectPath, stdio: 'pipe' });
          commandsRun++;
          onToken?.(`    ${chalk.greenBright('\u2713')} ${step.command}\n`);
        }
      } catch (e: any) {
        const msg = `${step.type} failed: ${e.message}`;
        errors.push(msg);
        onToken?.(`    ${chalk.redBright('\u2717')} ${msg}\n`);
      }
    }

    return { filesWritten, commandsRun, errors };
  }

  async autoFix(onToken?: (token: string) => void): Promise<{ filesFixed: number; errors: string[] }> {
    const errors: string[] = [];
    let filesFixed = 0;

    const buildCommands = ['npm run build', 'npx tsc --noEmit', 'npx next build --no-lint'];
    let buildOutput = '';

    for (const cmd of buildCommands) {
      try {
        const result = execSync(cmd, { cwd: this.projectPath, stdio: 'pipe', encoding: 'utf-8' });
        buildOutput += result;
      } catch (e: any) {
        buildOutput += e.stdout || '';
        buildOutput += e.stderr || '';
      }
    }

    if (!buildOutput) {
      onToken?.(`  ${chalk.greenBright('\u2713')} No build errors found\n`);
      return { filesFixed: 0, errors: [] };
    }

    onToken?.(`\n  ${chalk.bold.yellowBright('FIXING BUILD ERRORS')}\n`);
    const fixPlan = await this.generateFixPlan(buildOutput);

    for (const action of fixPlan) {
      onToken?.(`  ${chalk.yellowBright('\u25B8')} ${action.description}\n`);

      try {
        if (action.type === 'file' && action.filePath && action.content) {
          const fullPath = path.resolve(this.projectPath, action.filePath);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(fullPath, action.content, 'utf-8');
          filesFixed++;
          onToken?.(`    ${chalk.greenBright('\u2713')} Fixed ${action.filePath}\n`);
        }
      } catch (e: any) {
        errors.push(e.message);
        onToken?.(`    ${chalk.redBright('\u2717')} ${e.message}\n`);
      }
    }

    return { filesFixed, errors };
  }

  private async generatePlan(goal: string, analysis: ProjectAnalysis): Promise<BuildPlan> {
    const prompt = [
      `Project: ${analysis.name}`,
      `Tech: ${analysis.techStack.join(', ')}`,
      `Files: ${analysis.structure.length}`,
      `Missing: ${analysis.missingFiles.join(', ') || 'none'}`,
      `Entry points: ${analysis.entryPoints.join(', ') || 'none'}`,
      '',
      `Goal: ${goal}`,
      '',
      `You are a build engineer. Given the project above, generate a JSON build plan.
The plan must have a "goal" string and "steps" array.
Each step has: type ("create"|"modify"|"command"), file (path), description, code (file content), command (shell cmd).

IMPORTANT: Generate COMPLETE file contents in "code" field.
For "create", provide the full file content.
For "modify", read the existing file first and update it.

Return ONLY valid JSON. No markdown backticks.`,
    ].join('\n');

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are a senior build engineer. Generate build plans as JSON only.' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.provider.generate({ messages, temperature: 0.2, maxTokens: 8000 });
      const json = response.content.replace(/```json\s*|\s*```/g, '').trim();
      return JSON.parse(json) as BuildPlan;
    } catch {
      return {
        goal,
        steps: [
          { type: 'create', file: 'README.md', description: 'Create README', code: `# ${analysis.name}\n\n${goal}\n` },
        ],
      };
    }
  }

  private async generateFixPlan(buildOutput: string): Promise<BuildAction[]> {
    const prompt = [
      'Build errors found:',
      '```',
      buildOutput.slice(0, 4000),
      '```',
      '',
      'Generate a JSON array of fix actions. Each action has:',
      '- type: "file" or "shell"',
      '- description: what the fix does',
      '- filePath: relative path to fix',
      '- content: full corrected file content (if type is "file")',
      '- command: shell command to run (if type is "shell")',
      '',
      'Return ONLY valid JSON array. No markdown.',
    ].join('\n');

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are an automated fix engineer. Generate fix actions as JSON only.' },
      { role: 'user', content: prompt },
    ];

    try {
      const response = await this.provider.generate({ messages, temperature: 0.1, maxTokens: 8000 });
      const json = response.content.replace(/```json\s*|\s*```/g, '').trim();
      return JSON.parse(json) as BuildAction[];
    } catch {
      return [];
    }
  }

  private async writeFile(relativePath: string, content: string): Promise<void> {
    const fullPath = path.resolve(this.projectPath, relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, 'utf-8');
  }
}
