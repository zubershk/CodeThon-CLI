import fs from 'fs';
import path from 'path';
import type { RuntimeEvent } from '../events/types';

export interface ExecutionRunMeta {
  runId: string;
  goal: string;
  command: string;
  cwd: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  summary?: string;
}

export interface ExecutionJournalPaths {
  runDir: string;
  eventsPath: string;
  metaPath: string;
  checkpointPath: string;
}

export class ExecutionJournal {
  readonly paths: ExecutionJournalPaths;

  constructor(private readonly rootDir: string, readonly meta: ExecutionRunMeta) {
    const runDir = path.join(rootDir, '.codethon', 'runs', meta.runId);
    this.paths = {
      runDir,
      eventsPath: path.join(runDir, 'events.jsonl'),
      metaPath: path.join(runDir, 'meta.json'),
      checkpointPath: path.join(runDir, 'checkpoint.json'),
    };
    fs.mkdirSync(runDir, { recursive: true });
    this.writeMeta(meta);
  }

  append(event: RuntimeEvent): void {
    fs.appendFileSync(this.paths.eventsPath, `${JSON.stringify(event)}\n`, 'utf-8');
  }

  checkpoint(data: Record<string, unknown>): void {
    const payload = {
      runId: this.meta.runId,
      savedAt: new Date().toISOString(),
      ...data,
    };
    fs.writeFileSync(this.paths.checkpointPath, JSON.stringify(payload, null, 2), 'utf-8');
  }

  complete(status: ExecutionRunMeta['status'], summary: string): void {
    this.meta.status = status;
    this.meta.summary = summary;
    this.meta.completedAt = new Date().toISOString();
    this.writeMeta(this.meta);
  }

  private writeMeta(meta: ExecutionRunMeta): void {
    fs.writeFileSync(this.paths.metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }

  static runsRoot(cwd: string): string {
    return path.join(cwd, '.codethon', 'runs');
  }

  static list(cwd: string): ExecutionRunMeta[] {
    const root = ExecutionJournal.runsRoot(cwd);
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root)
      .map(runId => path.join(root, runId, 'meta.json'))
      .filter(file => fs.existsSync(file))
      .map(file => JSON.parse(fs.readFileSync(file, 'utf-8')) as ExecutionRunMeta)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }

  static readEvents(cwd: string, runId: string): RuntimeEvent[] {
    const eventsPath = path.join(ExecutionJournal.runsRoot(cwd), runId, 'events.jsonl');
    if (!fs.existsSync(eventsPath)) return [];
    return fs.readFileSync(eventsPath, 'utf-8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => JSON.parse(line) as RuntimeEvent);
  }
}
