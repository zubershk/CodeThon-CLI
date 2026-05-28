import Conf from 'conf';
import path from 'path';
import os from 'os';
import type { ProviderType } from '../llm/providers/index';

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
  currentProjectId: string | null;
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
    currentProjectId: null,
    theme: 'dark',
  },
});

const ENV_KEY_MAP: Record<string, string> = {
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  groq: 'GROQ_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  together: 'TOGETHER_API_KEY',
  nvidia: 'NVIDIA_API_KEY',
  'local-server': '',
  ollama: '',
};

export function getLLMConfig(): LLMConfig {
  const config = store.get('llm');
  const envKey = ENV_KEY_MAP[config.provider];
  let apiKey = envKey ? process.env[envKey] || process.env[`CODETHON_${envKey}`] || '' : '';
  // Fallback: if OPENAI_API_KEY contains an nvapi-* key, route it to NVIDIA provider
  if (!apiKey && config.provider === 'nvidia') {
    const oaiKey = process.env.OPENAI_API_KEY || '';
    if (oaiKey.startsWith('nvapi-')) {
      apiKey = oaiKey;
    }
  }
  return { ...config, apiKey: apiKey || config.apiKey };
}

export function setLLMConfig(config: Partial<LLMConfig>): void {
  const current = store.get('llm');
  const { apiKey: _, ...safeConfig } = config;
  store.set('llm', { ...current, ...safeConfig });
}

export function getCurrentProjectId(): string | null {
  return store.get('currentProjectId');
}

export function setCurrentProjectId(id: string | null): void {
  store.set('currentProjectId', id);
}

export function getProjectsDir(): string {
  return path.join(CONFIG_PATH, 'projects');
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export { CONFIG_PATH };
