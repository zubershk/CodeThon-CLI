import Conf from 'conf';
import path from 'path';
import os from 'os';
import type { LLMConfig } from '@codethon/shared-types';

const CONFIG_PATH = path.join(os.homedir(), '.codethon');

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
      provider: 'nvidia',
      model: 'deepseek-ai/deepseek-v4-flash',
      temperature: 0.3,
      maxTokens: 4096,
    },
    currentProjectId: null,
    theme: 'dark',
  },
});

export function getLLMConfig(): LLMConfig {
  const config = store.get('llm');
  const apiKey = config.provider === 'nvidia'
    ? process.env.NVIDIA_API_KEY || process.env.CODETHON_NVIDIA_KEY || ''
    : process.env.OPENAI_API_KEY || process.env.CODETHON_OPENAI_KEY || '';
  return { ...config, apiKey };
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
  const dir = path.join(CONFIG_PATH, 'projects');
  return dir;
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export { CONFIG_PATH };
