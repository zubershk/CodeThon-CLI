import { getLLMConfig } from './config';

export const API_VARS = ['NVIDIA_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GROQ_API_KEY', 'DEEPSEEK_API_KEY', 'TOGETHER_API_KEY'];

export const PROVIDER_SETUP: Record<string, { envVar: string; url: string; free: boolean }> = {
  openai: { envVar: 'OPENAI_API_KEY', url: 'https://platform.openai.com/api-keys', free: false },
  anthropic: { envVar: 'ANTHROPIC_API_KEY', url: 'https://console.anthropic.com/settings/keys', free: false },
  groq: { envVar: 'GROQ_API_KEY', url: 'https://console.groq.com/keys', free: true },
  deepseek: { envVar: 'DEEPSEEK_API_KEY', url: 'https://platform.deepseek.com/api_keys', free: false },
  together: { envVar: 'TOGETHER_API_KEY', url: 'https://api.together.ai/settings/api-keys', free: false },
  nvidia: { envVar: 'NVIDIA_API_KEY', url: 'https://build.nvidia.com', free: true },
  ollama: { envVar: '', url: 'https://ollama.ai', free: true },
  'local-server': { envVar: '', url: 'https://lmstudio.ai', free: true },
};

function getDisplayName(providerName: string): string {
  const map: Record<string, string> = { nvidia: 'NVIDIA', openai: 'OpenAI', groq: 'Groq' };
  return map[providerName] || providerName.charAt(0).toUpperCase() + providerName.slice(1);
}

export function hasAnyApiKey(): boolean {
  return API_VARS.some(v => process.env[v]);
}

export function isAuthError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /401|403|429|500|unauthorized|forbidden|not.*api.*key|no.*api.*key|missing.*extension|insufficient.?quota/i.test(msg);
}

export function isQuotaError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /429|insufficient.?quota|quota|exceeded.*limit/i.test(msg);
}

export function formatApiError(error: unknown, providerName?: string): string {
  const msg = error instanceof Error ? error.message : String(error);
  const name = providerName || getLLMConfig().provider;
  const setup = PROVIDER_SETUP[name];

  const isAuth = isAuthError(error);
  if (!isAuth || !setup) return msg;

  const isQuota = isQuotaError(error);

  const display = getDisplayName(name);
  const lines: string[] = [];

  if (isQuota) {
    lines.push(`\u26A0  ${display} quota exceeded.`);
    lines.push(``, `  Check your billing at: ${setup.url}`);
    lines.push(`  Or switch to a different provider with: ct model`);
  } else {
    lines.push(`No valid API key for ${display}.`);
  }

  if (setup.envVar) {
    lines.push(``, `  Set ${setup.envVar} in your .env file:`, `  ${setup.envVar}=<your-key>`);
    if (setup.free) lines.push(`  (${display} offers free tier models)`);
    lines.push(``, `  PowerShell:  ${setup.envVar}="<your-key>"`, `  CMD:         set ${setup.envVar}=<your-key>`);
  } else {
    lines.push(``, `  ${display} is a local provider — no API key needed.`);
    lines.push(`  Make sure the server is running at ${setup.url}.`);
  }

  const fallbacks = Object.entries(PROVIDER_SETUP).filter(([, v]) => v.free && v.envVar !== setup.envVar);
  if (fallbacks.length > 0) {
    lines.push(``, `  Or use a free/alternative provider:`);
    for (const [pname, info] of fallbacks) {
      const keyPart = info.envVar ? `  ${info.envVar}=<your-key>` : '  (local, no key needed)';
      lines.push(`    \u2022 ${getDisplayName(pname)}`);
      lines.push(`      ${keyPart}`);
      lines.push(`      Run: ct model  (select ${pname})`);
    }
  }

  return lines.join('\n');
}

export function friendlyAgentError(error: unknown): string {
  return `\u26A0  AI service unavailable.\n\n${formatApiError(error)}\n\n  Or run: ct doctor  (system diagnostics without AI)`;
}
