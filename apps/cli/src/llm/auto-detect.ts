import type { ProviderConfig, ProviderType } from './providers/index';

export interface DetectedModel extends ProviderConfig {
  displayName: string;
  contextWindow: number;
}

const MODEL_CATALOG: Record<string, { provider: ProviderType; displayName: string; contextWindow: number; envKey: string; costPer1MTokens: { input: number; output: number } }> = {
  // OpenAI
  'gpt-4o': { provider: 'openai', displayName: 'GPT-4o', contextWindow: 128000, envKey: 'OPENAI_API_KEY', costPer1MTokens: { input: 2.50, output: 10.00 } },
  'gpt-4o-mini': { provider: 'openai', displayName: 'GPT-4o Mini', contextWindow: 128000, envKey: 'OPENAI_API_KEY', costPer1MTokens: { input: 0.15, output: 0.60 } },
  'gpt-4.1': { provider: 'openai', displayName: 'GPT-4.1', contextWindow: 128000, envKey: 'OPENAI_API_KEY', costPer1MTokens: { input: 2.50, output: 10.00 } },
  'o3': { provider: 'openai', displayName: 'o3', contextWindow: 200000, envKey: 'OPENAI_API_KEY', costPer1MTokens: { input: 15.00, output: 60.00 } },
  'o4-mini': { provider: 'openai', displayName: 'o4 Mini', contextWindow: 200000, envKey: 'OPENAI_API_KEY', costPer1MTokens: { input: 3.00, output: 12.00 } },
  // Anthropic
  'claude-3-5-sonnet-20241022': { provider: 'anthropic', displayName: 'Claude 3.5 Sonnet', contextWindow: 200000, envKey: 'ANTHROPIC_API_KEY', costPer1MTokens: { input: 3.00, output: 15.00 } },
  'claude-3-5-haiku-20241022': { provider: 'anthropic', displayName: 'Claude 3.5 Haiku', contextWindow: 200000, envKey: 'ANTHROPIC_API_KEY', costPer1MTokens: { input: 0.80, output: 4.00 } },
  'claude-3-opus-20240229': { provider: 'anthropic', displayName: 'Claude 3 Opus', contextWindow: 200000, envKey: 'ANTHROPIC_API_KEY', costPer1MTokens: { input: 15.00, output: 75.00 } },
  // Groq (free)
  'mixtral-8x7b-32768': { provider: 'groq', displayName: 'Mixtral 8x7B (Groq)', contextWindow: 32768, envKey: 'GROQ_API_KEY', costPer1MTokens: { input: 0, output: 0 } },
  'llama-3.3-70b-versatile': { provider: 'groq', displayName: 'Llama 3.3 70B (Groq)', contextWindow: 131072, envKey: 'GROQ_API_KEY', costPer1MTokens: { input: 0, output: 0 } },
  'llama-3.1-8b-instant': { provider: 'groq', displayName: 'Llama 3.1 8B (Groq)', contextWindow: 131072, envKey: 'GROQ_API_KEY', costPer1MTokens: { input: 0, output: 0 } },
  'gemma2-9b-it': { provider: 'groq', displayName: 'Gemma 2 9B (Groq)', contextWindow: 8192, envKey: 'GROQ_API_KEY', costPer1MTokens: { input: 0, output: 0 } },
  // DeepSeek
  'deepseek-chat': { provider: 'deepseek', displayName: 'DeepSeek Chat', contextWindow: 131072, envKey: 'DEEPSEEK_API_KEY', costPer1MTokens: { input: 0.14, output: 0.28 } },
  'deepseek-reasoner': { provider: 'deepseek', displayName: 'DeepSeek Reasoner', contextWindow: 131072, envKey: 'DEEPSEEK_API_KEY', costPer1MTokens: { input: 0.55, output: 2.19 } },
  // Together
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': { provider: 'together', displayName: 'Llama 3.3 70B (Together)', contextWindow: 131072, envKey: 'TOGETHER_API_KEY', costPer1MTokens: { input: 0.10, output: 0.10 } },
  'mistralai/Mixtral-8x22B-Instruct-v0.1': { provider: 'together', displayName: 'Mixtral 8x22B (Together)', contextWindow: 65536, envKey: 'TOGETHER_API_KEY', costPer1MTokens: { input: 0.10, output: 0.10 } },
  // NVIDIA (OpenAI-compatible at build.nvidia.com)
  'deepseek-ai/deepseek-v4-flash': { provider: 'nvidia', displayName: 'DeepSeek V4 Flash (NVIDIA)', contextWindow: 131072, envKey: 'NVIDIA_API_KEY', costPer1MTokens: { input: 0, output: 0 } },
  'nvidia/llama-3.3-nemotron-super-49b-v1': { provider: 'nvidia', displayName: 'Nemotron Super 49B (NVIDIA)', contextWindow: 128000, envKey: 'NVIDIA_API_KEY', costPer1MTokens: { input: 0, output: 0 } },
  'meta/llama-3.1-70b-instruct': { provider: 'nvidia', displayName: 'Llama 3.1 70B (NVIDIA)', contextWindow: 128000, envKey: 'NVIDIA_API_KEY', costPer1MTokens: { input: 0, output: 0 } },
};

export async function detectAvailableModels(): Promise<DetectedModel[]> {
  const available: DetectedModel[] = [];

  // Check cloud providers by env vars
  const nvidiaFallbackKey = process.env.OPENAI_API_KEY?.startsWith('nvapi-') ? process.env.OPENAI_API_KEY : undefined;

  for (const [modelId, info] of Object.entries(MODEL_CATALOG)) {
    let apiKey = process.env[info.envKey];
    // NVIDIA models: also accept nvapi-* key stored in OPENAI_API_KEY
    if (!apiKey && info.provider === 'nvidia' && nvidiaFallbackKey) {
      apiKey = nvidiaFallbackKey;
    }
    if (apiKey) {
      available.push({
        provider: info.provider,
        modelId,
        apiKey,
        displayName: info.displayName,
        contextWindow: info.contextWindow,
        costPer1MTokens: info.costPer1MTokens,
      });
    }
  }

  // Check for local Ollama
  try {
    const response = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) });
    if (response.ok) {
      const data = await response.json() as { models: { name: string }[] };
      for (const model of data.models || []) {
        available.push({
          provider: 'ollama',
          modelId: model.name,
          baseURL: 'http://localhost:11434',
          displayName: `Ollama: ${model.name}`,
          contextWindow: 4096,
          costPer1MTokens: { input: 0, output: 0 },
        });
      }
    }
  } catch { /* Ollama not running */ }

  // Check for LM Studio (port 1234)
  try {
    const response = await fetch('http://localhost:1234/v1/models', { signal: AbortSignal.timeout(1000) });
    if (response.ok) {
      const data = await response.json() as { data: { id: string }[] };
      for (const model of data.data || []) {
        available.push({
          provider: 'local-server',
          modelId: model.id,
          baseURL: 'http://localhost:1234/v1',
          displayName: `LM Studio: ${model.id}`,
          contextWindow: 4096,
          costPer1MTokens: { input: 0, output: 0 },
        });
      }
    }
  } catch { /* LM Studio not running */ }

  // Check for LocalAI (port 8080)
  try {
    const response = await fetch('http://localhost:8080/v1/models', { signal: AbortSignal.timeout(1000) });
    if (response.ok) {
      const data = await response.json() as { data: { id: string }[] };
      for (const model of data.data || []) {
        available.push({
          provider: 'local-server',
          modelId: model.id,
          baseURL: 'http://localhost:8080/v1',
          displayName: `LocalAI: ${model.id}`,
          contextWindow: 4096,
          costPer1MTokens: { input: 0, output: 0 },
        });
      }
    }
  } catch { /* LocalAI not running */ }

  return available;
}

export function rankModelsByUseCase(
  models: DetectedModel[],
  useCase: 'quick' | 'code-generation' | 'analysis' | 'research'
): DetectedModel[] {
  const priorityMap: Record<string, Record<string, number>> = {
    quick: {
      'ollama': 10,
      'groq': 9,
      'local-server': 8,
      'deepseek': 6,
      'together': 5,
      'openai': 4,
      'anthropic': 3,
    },
    'code-generation': {
      'anthropic': 10,
      'openai': 9,
      'deepseek': 8,
      'together': 6,
      'groq': 5,
      'ollama': 4,
      'local-server': 3,
    },
    analysis: {
      'anthropic': 10,
      'openai': 9,
      'groq': 7,
      'deepseek': 7,
      'together': 6,
      'ollama': 4,
      'local-server': 3,
    },
    research: {
      'anthropic': 10,
      'openai': 9,
      'deepseek': 7,
      'together': 6,
      'groq': 6,
      'ollama': 3,
      'local-server': 2,
    },
  };

  const priorities = priorityMap[useCase] || priorityMap.quick;

  return [...models].sort((a, b) => {
    const aPrio = priorities[a.provider] || 0;
    const bPrio = priorities[b.provider] || 0;
    if (bPrio !== aPrio) return bPrio - aPrio;
    return b.contextWindow - a.contextWindow;
  });
}

export async function displayModelSelector(models: DetectedModel[]): Promise<DetectedModel> {
  if (models.length === 0) {
    throw new Error('No LLM models detected. Set at least one API key (OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY) or run Ollama locally.');
  }

  if (models.length === 1) {
    return models[0];
  }

  console.log('\nAvailable LLM models:\n');
  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    const costStr = m.costPer1MTokens && m.costPer1MTokens.input === 0 && m.costPer1MTokens.output === 0
      ? 'FREE'
      : `$${m.costPer1MTokens?.input || '?'}/${m.costPer1MTokens?.output || '?'} per 1M tokens`;
    const cw = `${(m.contextWindow / 1000).toFixed(0)}K ctx`;
    console.log(`  ${i + 1}. ${m.displayName.padEnd(40)} [${m.provider.padEnd(12)}] ${costStr.padEnd(20)} ${cw}`);
  }

  return models[0];
}
