import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const SERVICE_NAME = 'codethon-cli';
const KNOWN_SECRET_KEYS = [
  'NVIDIA_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'GROQ_API_KEY',
  'DEEPSEEK_API_KEY',
  'TOGETHER_API_KEY',
] as const;

function getCredPath(): string {
  return path.join(os.homedir(), '.codethon', 'credentials.json');
}

function getWindowsSecretPath(key: string): string {
  return path.join(os.homedir(), '.codethon', 'secrets', `${key}.txt`);
}

function runPowerShell(script: string): { ok: boolean; stdout: string } {
  try {
    const result = spawnSync('powershell', ['-NoProfile', '-Command', script], {
      timeout: 5000,
      encoding: 'utf-8',
      windowsHide: true,
    });
    return { ok: result.status === 0, stdout: (result.stdout || '').trim() };
  } catch {
    return { ok: false, stdout: '' };
  }
}

// Windows DPAPI-backed secret files
async function winStore(key: string, value: string): Promise<boolean> {
  try {
    const secretPath = getWindowsSecretPath(key);
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    const safePath = secretPath.replace(/'/g, "''");
    const script = `
$secure = ConvertTo-SecureString @'
${value.replace(/'/g, "''")}
'@ -AsPlainText -Force
$encrypted = ConvertFrom-SecureString $secure
Set-Content -LiteralPath '${safePath}' -Value $encrypted
`;
    return runPowerShell(script).ok;
  } catch {
    return false;
  }
}

async function winLoad(key: string): Promise<string | null> {
  try {
    const secretPath = getWindowsSecretPath(key);
    if (!fs.existsSync(secretPath)) return null;
    const safePath = secretPath.replace(/'/g, "''");
    const script = `
if (-not (Test-Path -LiteralPath '${safePath}')) { exit 2 }
$encrypted = Get-Content -LiteralPath '${safePath}' -Raw
$secure = ConvertTo-SecureString $encrypted
$bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
[System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
`;
    const result = runPowerShell(script);
    return result.ok ? result.stdout : null;
  } catch {
    return null;
  }
}

async function winRemove(key: string): Promise<boolean> {
  try {
    const secretPath = getWindowsSecretPath(key);
    if (!fs.existsSync(secretPath)) return true;
    fs.unlinkSync(secretPath);
    return true;
  } catch {
    return false;
  }
}

// Try macOS Keychain via security CLI
async function macStore(key: string, value: string): Promise<boolean> {
  try {
    const r = spawnSync('security', ['add-generic-password', '-s', SERVICE_NAME, '-a', key, '-w', value], { timeout: 5000 });
    return r.status === 0;
  } catch { return false; }
}

async function macLoad(key: string): Promise<string | null> {
  try {
    const r = spawnSync('security', ['find-generic-password', '-s', SERVICE_NAME, '-a', key, '-w'], { timeout: 5000, encoding: 'utf-8' });
    if (r.status === 0) return (r.stdout || '').trim();
    return null;
  } catch { return null; }
}

async function macRemove(key: string): Promise<boolean> {
  try {
    const r = spawnSync('security', ['delete-generic-password', '-s', SERVICE_NAME, '-a', key], { timeout: 5000 });
    return r.status === 0;
  } catch { return false; }
}

// Try Linux secret-tool
async function linuxStore(key: string, value: string): Promise<boolean> {
  try {
    const r = spawnSync('secret-tool', ['store', '--label', `${SERVICE_NAME}:${key}`, 'service', SERVICE_NAME, 'key', key], {
      timeout: 5000,
      input: value,
      encoding: 'utf-8',
    });
    return r.status === 0;
  } catch { return false; }
}

async function linuxLoad(key: string): Promise<string | null> {
  try {
    const r = spawnSync('secret-tool', ['lookup', 'service', SERVICE_NAME, 'key', key], { timeout: 5000, encoding: 'utf-8' });
    if (r.status === 0) return (r.stdout || '').trim();
    return null;
  } catch { return null; }
}

async function linuxRemove(key: string): Promise<boolean> {
  try {
    const r = spawnSync('secret-tool', ['clear', 'service', SERVICE_NAME, 'key', key], { timeout: 5000 });
    return r.status === 0;
  } catch { return false; }
}

// File-based fallback (restricted permissions)
function fileStore(key: string, value: string): void {
  const credPath = getCredPath();
  const dir = path.dirname(credPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let store: Record<string, string> = {};
  try {
    if (fs.existsSync(credPath)) store = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
  } catch { /* ignore */ }

  store[key] = value;
  fs.writeFileSync(credPath, JSON.stringify(store, null, 2), { mode: 0o600 });
}

function fileLoad(key: string): string | null {
  const credPath = getCredPath();
  try {
    if (fs.existsSync(credPath)) {
      const store = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
      return store[key] || null;
    }
  } catch { /* ignore */ }
  return null;
}

function fileRemove(key: string): void {
  const credPath = getCredPath();
  try {
    if (fs.existsSync(credPath)) {
      const store = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
      delete store[key];
      fs.writeFileSync(credPath, JSON.stringify(store, null, 2), { mode: 0o600 });
    }
  } catch { /* ignore */ }
}

// Detect best available backend
let backend: 'dpapi' | 'keychain' | 'file' = 'file';
let backendName = '';

async function detectBackend(): Promise<void> {
  if (process.platform === 'darwin') {
    // Check if security CLI is available
    try {
      const r = spawnSync('which', ['security'], { timeout: 3000 });
      if (r.status === 0) {
        backend = 'keychain';
        backendName = 'macOS Keychain';
        return;
      }
    } catch { /* fall through */ }
  } else if (process.platform === 'win32') {
    backend = 'dpapi';
    backendName = 'Windows Data Protection API';
    return;
  } else {
    // Linux
    try {
      const r = spawnSync('which', ['secret-tool'], { timeout: 3000 });
      if (r.status === 0) {
        backend = 'keychain';
        backendName = 'Secret Service (libsecret)';
        return;
      }
    } catch { /* fall through */ }
  }

  backend = 'file';
  backendName = 'encrypted file';
}

export async function storeSecret(key: string, value: string): Promise<void> {
  await detectBackend();

  if (backend === 'dpapi') {
    const ok = await winStore(key, value);
    fileStore(key, value);
    if (ok) return;
  }

  if (backend === 'keychain') {
    let ok = false;
    if (process.platform === 'darwin') ok = await macStore(key, value);
    else ok = await linuxStore(key, value);
    fileStore(key, value);
    if (ok) return;
  }

  fileStore(key, value);
}

export async function loadSecret(key: string): Promise<string | null> {
  await detectBackend();

  if (backend === 'dpapi') {
    const val = await winLoad(key);
    if (val) return val;
  }

  if (backend === 'keychain') {
    let val: string | null = null;
    if (process.platform === 'darwin') val = await macLoad(key);
    else val = await linuxLoad(key);
    if (val) return val;
  }

  return fileLoad(key);
}

export async function removeSecret(key: string): Promise<void> {
  await detectBackend();

  if (backend === 'dpapi') {
    await winRemove(key);
  }

  if (backend === 'keychain') {
    if (process.platform === 'darwin') await macRemove(key);
    else await linuxRemove(key);
  }

  fileRemove(key);
}

export async function clearAllSecrets(): Promise<void> {
  const credPath = getCredPath();
  try {
    if (fs.existsSync(credPath)) fs.unlinkSync(credPath);
  } catch { /* ignore */ }

  // Try to clear keychain entries
  for (const key of KNOWN_SECRET_KEYS) {
    await removeSecret(key);
  }
}

export async function hydrateKnownSecrets(): Promise<void> {
  for (const key of KNOWN_SECRET_KEYS) {
    if (process.env[key]) continue;
    const value = await loadSecret(key);
    if (value) {
      process.env[key] = value;
    }
  }
}

export function getSecretBackendName(): string {
  if (backendName) return backendName;
  if (process.platform === 'win32') return 'Windows Data Protection API';
  if (process.platform === 'darwin') return 'macOS Keychain or file fallback';
  if (process.platform === 'linux') return 'Secret Service or file fallback';
  return 'file-based storage';
}
