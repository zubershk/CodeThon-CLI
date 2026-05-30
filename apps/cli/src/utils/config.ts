import Conf from 'conf';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import type { ProviderType } from '../llm/providers/index';
import { getOnboardingState } from '../features/onboarding';

const CONFIG_PATH = path.join(os.homedir(), '.codethon');

export interface LLMConfig {
  provider: ProviderType;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ConfigSchema {
  llm: LLMConfig;
  recentRepos: string[];
  theme: 'dark' | 'light';
}

const store = new Conf<ConfigSchema>({
  projectName: 'codethon-cli',
  cwd: CONFIG_PATH,
  defaults: {
    llm: {
      provider: 'nvidia' as unknown as ProviderType,
      model: 'deepseek-ai/deepseek-v4-flash',
      temperature: 0.3,
      maxTokens: 4096,
    },
    recentRepos: [],
    theme: 'dark',
  },
});

export const ENV_KEY_MAP: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  groq: 'GROQ_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  together: 'TOGETHER_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
  'local-server': '',
  ollama: '',
};

// ─── Repo-scoped session state ────────────────────────────────────

const SESSION_FILE = path.join(CONFIG_PATH, 'sessions.json');

// Fallback for non-repo environments (tests, CLI outside git)
let _fallbackProjectId: string | null = null;

interface SessionMap {
  [repoRoot: string]: {
    projectId: string;
    lastUsed: string;
  };
}

function loadSessions(): SessionMap {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {};
}

function saveSessions(sessions: SessionMap): void {
  const dir = path.dirname(SESSION_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
}

export function getRepoRoot(startDir?: string): string | null {
  let dir = startDir ? path.resolve(startDir) : process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, '.git'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function getSessionProjectId(repoRoot?: string): string | null {
  const root = repoRoot || getRepoRoot();
  if (!root) return _fallbackProjectId;
  const sessions = loadSessions();
  return sessions[root]?.projectId || null;
}

export function setSessionProjectId(projectId: string, repoRoot?: string): void {
  const root = repoRoot || getRepoRoot();
  if (!root) { _fallbackProjectId = projectId; return; }
  const sessions = loadSessions();
  sessions[root] = { projectId, lastUsed: new Date().toISOString() };

  // Keep only recent repos (last 10)
  const entries = Object.entries(sessions).sort((a, b) => b[1].lastUsed.localeCompare(a[1].lastUsed));
  if (entries.length > 10) {
    const pruned: SessionMap = {};
    for (let i = 0; i < 10; i++) pruned[entries[i][0]] = entries[i][1];
    saveSessions(pruned);
  } else {
    saveSessions(sessions);
  }
}

export function listRecentRepos(): { repoRoot: string; projectId: string; lastUsed: string }[] {
  const sessions = loadSessions();
  return Object.entries(sessions)
    .map(([repoRoot, s]) => ({ repoRoot, projectId: s.projectId, lastUsed: s.lastUsed }))
    .sort((a, b) => b.lastUsed.localeCompare(a.lastUsed));
}

// ─── Backward compat shims ─────────────────────────────────────────

export function getCurrentProjectId(): string | null {
  const root = getRepoRoot();
  if (!root) return _fallbackProjectId;
  return getSessionProjectId(root);
}

export function setCurrentProjectId(projectId: string | null, repoRoot?: string): void {
  const root = repoRoot || getRepoRoot();
  if (!root) { _fallbackProjectId = projectId; return; }
  const sessions = loadSessions();
  if (projectId) {
    sessions[root] = { projectId, lastUsed: new Date().toISOString() };
  } else {
    delete sessions[root];
  }
  const entries = Object.entries(sessions).sort((a, b) => b[1].lastUsed.localeCompare(a[1].lastUsed));
  if (entries.length > 10) {
    const pruned: SessionMap = {};
    for (let i = 0; i < 10; i++) pruned[entries[i][0]] = entries[i][1];
    saveSessions(pruned);
  } else {
    saveSessions(sessions);
  }
}

// ─── LLM config ────────────────────────────────────────────────────

export function getLLMConfig(): LLMConfig {
  const config = store.get('llm');
  const envKey = ENV_KEY_MAP[config.provider];
  let apiKey = envKey ? process.env[envKey] || process.env[`CODETHON_${envKey}`] || '' : '';
  if (!apiKey && config.provider === 'nvidia') {
    const oaiKey = process.env.OPENAI_API_KEY || '';
    if (oaiKey.startsWith('nvapi-')) apiKey = oaiKey;
  }
  return { ...config, apiKey: apiKey || config.apiKey };
}

const LOCAL_PROVIDERS = new Set(['ollama', 'local-server']);

export function validateProviderConfig(): { ok: true } | { ok: false; message: string } {
  const config = getLLMConfig();
  if (LOCAL_PROVIDERS.has(config.provider)) return { ok: true };
  if (!config.apiKey) {
    const envKey = ENV_KEY_MAP[config.provider] || 'API_KEY';
    const onboarding = getOnboardingState();
    const looksPreviouslyConfigured =
      onboarding.completed &&
      onboarding.provider === config.provider &&
      onboarding.apiKeySet;

    return {
      ok: false,
      message: looksPreviouslyConfigured
        ? `Your ${config.provider} setup exists, but no usable API key could be loaded from secure storage or the environment. Run "ct auth add" to save the key again.`
        : `No API key for ${config.provider}. Set ${envKey}=<your-key> in your .env file or run "ct onboard" to configure.`,
    };
  }
  return { ok: true };
}

export function setLLMConfig(config: Partial<LLMConfig>): void {
  const current = store.get('llm');
  const { apiKey: _, ...safeConfig } = config;
  store.set('llm', { ...current, ...safeConfig });
}

export function getThemeMode(): 'dark' | 'light' {
  return store.get('theme') || 'dark';
}

export function setThemeMode(mode: 'dark' | 'light'): void {
  store.set('theme', mode);
}

export function getProjectsDir(): string {
  return path.join(CONFIG_PATH, 'projects');
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function resetConfig(): void {
  store.clear();
  const onboardingPath = path.join(CONFIG_PATH, 'onboarding.json');
  try { if (fs.existsSync(onboardingPath)) fs.unlinkSync(onboardingPath); } catch { /* ignore */ }
  // Don't clear sessions, just the global config
}

export { CONFIG_PATH };
