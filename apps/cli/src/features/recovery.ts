import fs from 'fs';
import path from 'path';
import { sanitizeEnv } from '../utils/env';

export interface RecoveryPoint {
  id: string;
  timestamp: number;
  description: string;
  files: { path: string; content: string }[];
  state: Record<string, unknown>;
}

export class RecoverySystem {
  private recoveryDir: string;
  private maxPoints: number;

  constructor(projectRoot: string, maxPoints = 20) {
    this.recoveryDir = path.join(projectRoot, '.codethon', 'recovery');
    this.maxPoints = maxPoints;
    if (!fs.existsSync(this.recoveryDir)) {
      fs.mkdirSync(this.recoveryDir, { recursive: true });
    }
  }

  async capturePoint(description: string, state: Record<string, unknown> = {}): Promise<string> {
    const id = `rp_${Date.now()}`;
    const files: { path: string; content: string }[] = [];

    const srcDir = path.resolve(this.recoveryDir, '..', '..', 'src');
    if (fs.existsSync(srcDir)) {
      const srcFiles = this.findFiles(srcDir, /\.(ts|tsx|js|jsx|json|css|html)$/);
      for (const file of srcFiles.slice(0, 30)) {
        try {
          const relPath = path.relative(path.resolve(this.recoveryDir, '..', '..'), file);
          files.push({ path: relPath, content: fs.readFileSync(file, 'utf-8') });
        } catch { /* skip */ }
      }
    }

    const point: RecoveryPoint = {
      id,
      timestamp: Date.now(),
      description,
      files,
      state,
    };

    fs.writeFileSync(
      path.join(this.recoveryDir, `${id}.json`),
      JSON.stringify(point, null, 2),
      'utf-8',
    );

    this.prune();
    return id;
  }

  getHistory(): { id: string; timestamp: number; description: string }[] {
    if (!fs.existsSync(this.recoveryDir)) return [];
    return fs.readdirSync(this.recoveryDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(this.recoveryDir, f), 'utf-8'));
          return { id: data.id, timestamp: data.timestamp, description: data.description };
        } catch { return null; }
      })
      .filter((x): x is { id: string; timestamp: number; description: string } => x !== null)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  restore(id: string): RecoveryPoint | null {
    const filePath = path.join(this.recoveryDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;

    try {
      const point = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RecoveryPoint;
      for (const file of point.files) {
        const fullPath = path.resolve(this.recoveryDir, '..', '..', file.path);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, file.content, 'utf-8');
      }
      return point;
    } catch {
      return null;
    }
  }

  private findFiles(dir: string, pattern: RegExp): string[] {
    const files: string[] = [];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'dist') {
            files.push(...this.findFiles(full, pattern));
          }
        } else if (pattern.test(entry.name)) {
          files.push(full);
        }
      }
    } catch { /* skip */ }
    return files;
  }

  private prune(): void {
    const files = fs.readdirSync(this.recoveryDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    while (files.length > this.maxPoints) {
      const file = files.pop()!;
      try { fs.unlinkSync(path.join(this.recoveryDir, file)); } catch { /* ignore */ }
    }
  }
}

export class GracefulShutdown {
  private handlers: (() => Promise<void>)[] = [];
  private shuttingDown = false;

  constructor() {
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('unhandledRejection', (reason) => {
      console.error('\nUnhandled Rejection:', reason);
    });
    process.on('uncaughtException', (err) => {
      console.error('\nUncaught Exception:', err);
    });
  }

  onShutdown(handler: () => Promise<void>): void {
    this.handlers.push(handler);
  }

  private async shutdown(signal: string): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    console.log(`\nReceived ${signal}. Shutting down gracefully...`);

    for (const handler of this.handlers) {
      try {
        await handler();
      } catch { /* ignore handler errors during shutdown */ }
    }

    process.exit(0);
  }
}
