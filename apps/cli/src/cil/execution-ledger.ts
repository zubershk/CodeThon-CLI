import path from 'path';
import type { ToolResult } from './tools';

export interface ExecutionArtifact {
  path: string;
  bytes?: number;
  dryRun: boolean;
}

export interface ExecutionCheck {
  tool: string;
  label: string;
  success: boolean;
  detail: string;
}

export interface ExecutionSnapshot {
  artifacts: ExecutionArtifact[];
  checks: ExecutionCheck[];
  errors: string[];
  toolCount: number;
}

export interface ExecutionReceipt extends ExecutionSnapshot {
  success: boolean;
  reason: 'model_done' | 'artifact_verified' | 'verified_workflow';
  summary: string;
  elapsed: number;
}

const FILE_EXT_RE = /(?:^|[\s"'`(])([\w./\\-]+\.(?:txt|md|mdx|json|ya?ml|csv|ts|tsx|js|jsx|py|html|css|scss|sql|toml|ini|sh|ps1|bat))(?![\w.-])/gi;
const CREATE_RE = /\b(create|make|write|generate|save|add|draft)\b/i;
const VERIFY_RE = /\b(build|test|fix|debug|verify|lint|typecheck|deploy|install|refactor|migrate|release)\b/i;
const DOCUMENT_RE = /\b(resume|readme|document|doc|txt file|markdown|report|summary|brief|pitch|script)\b/i;

export class ExecutionLedger {
  private readonly artifacts: ExecutionArtifact[] = [];
  private readonly checks: ExecutionCheck[] = [];
  private readonly errors: string[] = [];
  private toolCount = 0;
  private readonly requestedFiles: string[];

  constructor(private readonly goal: string) {
    this.requestedFiles = this.extractRequestedFiles(goal);
  }

  recordResult(result: ToolResult): void {
    this.toolCount++;

    if (result.error) {
      this.errors.push(`${this.humanTool(result.tool)}: ${result.error}`);
      this.checks.push({
        tool: result.tool,
        label: this.humanTool(result.tool),
        success: false,
        detail: result.error,
      });
      return;
    }

    if (result.tool === 'write_file') {
      const artifact = this.parseWriteArtifact(result.output);
      if (artifact) this.upsertArtifact(artifact);
      this.checks.push({
        tool: result.tool,
        label: 'file write',
        success: true,
        detail: artifact ? `${artifact.dryRun ? 'would write' : 'wrote'} ${artifact.path}` : 'file saved',
      });
      return;
    }

    this.checks.push({
      tool: result.tool,
      label: this.humanTool(result.tool),
      success: true,
      detail: this.summarizeOutput(result.output),
    });
  }

  snapshot(): ExecutionSnapshot {
    return {
      artifacts: [...this.artifacts],
      checks: [...this.checks],
      errors: [...this.errors],
      toolCount: this.toolCount,
    };
  }

  completeFromModel(summary: string, elapsed: number): ExecutionReceipt {
    return this.buildReceipt('model_done', summary || 'The model reported the goal is complete.', elapsed);
  }

  evaluateCompletion(elapsed: number): ExecutionReceipt | null {
    const realArtifacts = this.artifacts.filter(artifact => !artifact.dryRun);
    if (realArtifacts.length === 0) return null;

    const lower = this.goal.toLowerCase();
    const hasCreateIntent = CREATE_RE.test(lower);
    const hasVerificationIntent = VERIFY_RE.test(lower);
    const hasDocumentIntent = DOCUMENT_RE.test(lower);
    const requestedArtifactsReady = this.requestedFiles.length > 0 && this.allRequestedFilesWritten(realArtifacts);
    const successfulVerifier = this.checks.some(check => check.success && check.tool === 'run_command');
    const blockingErrors = this.errors.filter(error => /write file|command|run command/i.test(error));

    if (blockingErrors.length > 0) return null;

    if (hasVerificationIntent && successfulVerifier) {
      return this.buildReceipt(
        'verified_workflow',
        this.buildArtifactSummary('Work completed and verified by a command run.', realArtifacts),
        elapsed,
      );
    }

    if (!hasVerificationIntent && (requestedArtifactsReady || (hasCreateIntent && hasDocumentIntent))) {
      return this.buildReceipt(
        'artifact_verified',
        this.buildArtifactSummary('Requested artifact completed from tool evidence.', realArtifacts),
        elapsed,
      );
    }

    return null;
  }

  evidencePrompt(): string {
    const snapshot = this.snapshot();
    const artifacts = snapshot.artifacts
      .filter(artifact => !artifact.dryRun)
      .map(artifact => artifact.bytes == null ? artifact.path : `${artifact.path} (${artifact.bytes} bytes)`);
    const checks = snapshot.checks
      .slice(-8)
      .map(check => `${check.success ? 'ok' : 'issue'} ${check.label}: ${check.detail}`);

    return [
      'Execution evidence so far:',
      artifacts.length > 0 ? `- Files delivered: ${artifacts.join(', ')}` : '- Files delivered: none yet',
      checks.length > 0 ? `- Recent checks: ${checks.join(' | ')}` : '',
      snapshot.errors.length > 0 ? `- Open issues: ${snapshot.errors.slice(-4).join(' | ')}` : '',
      'Completion rule: if the requested deliverables are present and no required verification is missing, output DONE: with a concise user-facing summary now. Continue only for missing files, failed checks, or explicit verification work.',
    ].filter(Boolean).join('\n');
  }

  private buildReceipt(reason: ExecutionReceipt['reason'], summary: string, elapsed: number): ExecutionReceipt {
    return {
      ...this.snapshot(),
      success: true,
      reason,
      summary,
      elapsed,
    };
  }

  private buildArtifactSummary(prefix: string, artifacts: ExecutionArtifact[]): string {
    const files = artifacts
      .map(artifact => artifact.bytes == null ? artifact.path : `${artifact.path} (${artifact.bytes} bytes)`)
      .join(', ');
    const checks = this.checks
      .filter(check => check.success && check.tool !== 'write_file')
      .map(check => check.label)
      .filter((label, index, all) => all.indexOf(label) === index)
      .slice(0, 4);

    return [
      prefix,
      `Delivered: ${files}`,
      checks.length > 0 ? `Evidence: ${checks.join(', ')}` : '',
    ].filter(Boolean).join('\n');
  }

  private extractRequestedFiles(goal: string): string[] {
    const files: string[] = [];
    const seen = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = FILE_EXT_RE.exec(goal)) !== null) {
      const raw = match[1].replace(/[),.;:]+$/, '');
      if (/^(https?:\/\/|www\.)/i.test(raw)) continue;
      const key = this.baseName(raw);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      files.push(raw);
    }

    if (/\breadme\b/i.test(goal) && !seen.has('readme.md')) {
      seen.add('readme.md');
      files.push('README.md');
    }

    return files;
  }

  private allRequestedFilesWritten(artifacts: ExecutionArtifact[]): boolean {
    const written = new Set(artifacts.map(artifact => this.baseName(artifact.path)));
    return this.requestedFiles.every(file => written.has(this.baseName(file)));
  }

  private parseWriteArtifact(output: string): ExecutionArtifact | null {
    const firstLine = (output || '').split(/\r?\n/)[0]?.trim() || '';
    const dryRunMatch = firstLine.match(/^\[DRY RUN\]\s+Would write\s+(.+?)\s+\((\d+)\s+bytes\)/i);
    if (dryRunMatch) {
      return { path: dryRunMatch[1].trim(), bytes: Number(dryRunMatch[2]), dryRun: true };
    }

    const wroteMatch = firstLine.match(/^Wrote\s+(.+?)\s+\((\d+)\s+bytes\)/i);
    if (!wroteMatch) return null;
    return { path: wroteMatch[1].trim(), bytes: Number(wroteMatch[2]), dryRun: false };
  }

  private upsertArtifact(artifact: ExecutionArtifact): void {
    const key = this.baseName(artifact.path);
    const index = this.artifacts.findIndex(item => this.baseName(item.path) === key);
    if (index >= 0) {
      this.artifacts[index] = artifact;
      return;
    }
    this.artifacts.push(artifact);
  }

  private humanTool(tool: string): string {
    return tool.replace(/_/g, ' ');
  }

  private summarizeOutput(output: string): string {
    const clean = (output || '').replace(/\r/g, '').trim();
    if (!clean) return 'completed without output';
    return clean.split('\n').map(line => line.trim()).filter(Boolean)[0]?.slice(0, 140) || 'completed';
  }

  private baseName(file: string): string {
    return path.basename(file.replace(/\\/g, '/')).toLowerCase();
  }
}
