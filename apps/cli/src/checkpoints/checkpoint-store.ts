import fs from 'fs';
import path from 'path';

export interface RuntimeCheckpoint {
  runId: string;
  goal: string;
  state: string;
  iteration?: number;
  savedAt: string;
  journalDir: string;
  data?: Record<string, unknown>;
}

export class CheckpointStore {
  private readonly latestPath: string;

  constructor(private readonly cwd: string) {
    this.latestPath = path.join(cwd, '.codethon', 'latest-runtime-checkpoint.json');
  }

  save(checkpoint: RuntimeCheckpoint): void {
    const dir = path.dirname(this.latestPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.latestPath, JSON.stringify(checkpoint, null, 2), 'utf-8');
  }

  loadLatest(): RuntimeCheckpoint | null {
    if (!fs.existsSync(this.latestPath)) return null;
    return JSON.parse(fs.readFileSync(this.latestPath, 'utf-8')) as RuntimeCheckpoint;
  }

  clear(): void {
    if (!fs.existsSync(this.latestPath)) return;
    fs.unlinkSync(this.latestPath);
  }
}
