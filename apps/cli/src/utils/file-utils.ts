import fs from 'fs';
import path from 'path';

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function readJSON<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export function writeJSON<T>(filePath: string, data: T): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function readFile(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export function writeFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function listDirs(dir: string): string[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((item) => {
      const stat = fs.statSync(path.join(dir, item));
      return stat.isDirectory();
    });
  } catch {
    return [];
  }
}

export function listFiles(dir: string, ext?: string): string[] {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((item) => {
      if (ext) return item.endsWith(ext);
      return true;
    });
  } catch {
    return [];
  }
}
