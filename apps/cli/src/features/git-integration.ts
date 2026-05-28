import { spawnSync } from 'child_process';
import { LLMRouter } from '../llm/index';
import type { LLMMessage } from '../llm/index';
import { sanitizeEnv, resolveBin } from '../utils/env';

export interface CommitSuggestion {
  message: string;
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'perf' | 'test' | 'chore';
  scope?: string;
  description: string;
}

export interface PRInfo {
  title: string;
  description: string;
  relatedIssues: string[];
  suggestedReviewers: string[];
}

export interface ReviewComment {
  file: string;
  line: number;
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

export class GitIntegration {
  private projectRoot: string;
  private router: LLMRouter;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.router = new LLMRouter();
  }

  private git(args: string[]): { stdout: string; stderr: string; status: number } {
    const result = spawnSync('git', args, {
      cwd: this.projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8',
      env: sanitizeEnv(),
    });
    return {
      stdout: result.stdout?.toString() || '',
      stderr: result.stderr?.toString() || '',
      status: result.status ?? -1,
    };
  }

  getDiff(): string {
    const staged = this.git(['diff', '--cached']);
    if (staged.stdout) return staged.stdout;
    const unstaged = this.git(['diff']);
    if (unstaged.stdout) return unstaged.stdout;
    return '';
  }

  getChangedFiles(): string[] {
    const staged = this.git(['diff', '--cached', '--name-only']);
    if (staged.stdout) return staged.stdout.split('\n').filter(Boolean);
    const unstaged = this.git(['diff', '--name-only']);
    if (unstaged.stdout) return unstaged.stdout.split('\n').filter(Boolean);
    return this.git(['status', '--porcelain']).stdout.split('\n').filter(Boolean).map(l => l.slice(3));
  }

  getRecentCommits(count = 10): string {
    const result = this.git(['log', `--oneline`, `-${count}`]);
    return result.stdout;
  }

  async generateCommitMessage(): Promise<CommitSuggestion> {
    const diff = this.getDiff();
    const changedFiles = this.getChangedFiles();

    const prompt = `Generate a conventional commit message for these changes:

Changed files:
${changedFiles.join('\n')}

Diff:
${diff.slice(0, 3000)}

Respond with JSON:
{
  "type": "feat|fix|docs|style|refactor|perf|test|chore",
  "scope": "optional scope",
  "description": "short description (max 50 chars)",
  "message": "full commit message"
}`;

    try {
      const result = await this.router.callWithFallback(prompt, 'quick');
      const json = JSON.parse(result.response.replace(/```json\s*|\s*```/g, '').trim());
      return {
        type: json.type || 'chore',
        scope: json.scope,
        description: json.description || '',
        message: json.message || json.description || 'Update files',
      };
    } catch {
      return {
        type: 'chore',
        description: 'Update files',
        message: changedFiles.length > 0
          ? `chore: update ${changedFiles[0]}${changedFiles.length > 1 ? ` and ${changedFiles.length - 1} more` : ''}`
          : 'chore: update files',
      };
    }
  }

  async createPR(title?: string, description?: string): Promise<{ url: string }> {
    const changedFiles = this.getChangedFiles();
    const recentCommits = this.getRecentCommits(5);

    if (!title) {
      const prompt = `Generate a GitHub PR title and description for these changes:

Changed files:
${changedFiles.join('\n')}

Recent commits:
${recentCommits}

Respond with JSON:
{
  "title": "PR title",
  "description": "PR description with bullet points",
  "relatedIssues": ["#issue numbers if any"]
}`;

      try {
        const result = await this.router.callWithFallback(prompt, 'analysis');
        const json = JSON.parse(result.response.replace(/```json\s*|\s*```/g, '').trim());
        title = json.title || 'Updates';
        description = json.description || 'Automated PR';
      } catch {
        title = 'Updates';
        description = 'Automated changes';
      }
    }

    const branchName = `feature/auto-${Date.now()}`;
    this.git(['checkout', '-b', branchName]);
    this.git(['add', '.']);
    this.git(['commit', '-m', title || 'Updates']);

    const pushResult = this.git(['push', '-u', 'origin', branchName]);
    if (pushResult.status !== 0) {
      throw new Error(`Failed to push branch: ${pushResult.stderr}`);
    }

    const ghResult = this.git(['gh', 'pr', 'create', '--title', title || '', '--body', description || '']);
    if (ghResult.status !== 0) {
      throw new Error(`Failed to create PR: ${ghResult.stderr}`);
    }

    const url = ghResult.stdout.trim();
    return { url };
  }

  async reviewCode(): Promise<ReviewComment[]> {
    const diff = this.getDiff();
    const changedFiles = this.getChangedFiles();

    const prompt = `Review this code diff for issues:

Files: ${changedFiles.join(', ')}

Diff:
${diff.slice(0, 5000)}

Respond with JSON array of review comments:
[{
  "file": "path/to/file.ts",
  "line": 42,
  "severity": "info|warning|error",
  "message": "description of the issue",
  "suggestion": "optional fix suggestion"
}]`;

    try {
      const result = await this.router.callWithFallback(prompt, 'analysis');
      const json = JSON.parse(result.response.replace(/```json\s*|\s*```/g, '').trim());
      return Array.isArray(json) ? json : [];
    } catch {
      return [];
    }
  }

  async suggestBranchName(): Promise<string> {
    const diff = this.getDiff();
    const prompt = `Suggest a git branch name for these changes (lowercase, kebab-case):
${diff.slice(0, 1000)}

Return only the branch name, nothing else.`;

    try {
      const result = await this.router.callWithFallback(prompt, 'quick');
      return result.response.trim().replace(/\s+/g, '-').toLowerCase().slice(0, 50);
    } catch {
      return `auto-${Date.now()}`;
    }
  }
}
