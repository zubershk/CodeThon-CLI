import fs from 'fs';
import path from 'path';
import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { createProvider } from '@codethon/llm-client';
import { getLLMConfig } from '../utils/config';
import { startAgent, succeedAgent, failAgent } from '../utils/agent-feed';
import { logger } from '../utils';
import { streamMarkdownResponse } from '../utils/llm-stream';

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', 'out', 'coverage', '.cache', '__pycache__', '.venv']);

function scanRepoStructure(dir: string, depth = 3): string[] {
  if (depth <= 0) return [];
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.') || SKIP_DIRS.has(e.name)) continue;
      const full = path.join(dir, e.name);
      const rel = path.relative(process.cwd(), full);
      if (e.isDirectory()) {
        results.push(`dir  ${rel}/`);
        results.push(...scanRepoStructure(full, depth - 1));
      } else {
        const stat = fs.statSync(full);
        results.push(`file ${rel} (${(stat.size / 1024).toFixed(1)} KB)`);
      }
    }
  } catch { /* skip */ }
  return results;
}

function readKeyConfigs(): Record<string, string> {
  const configs: Record<string, string> = {};
  const candidates = ['package.json', 'tsconfig.json', 'next.config.js', 'next.config.ts', 'vite.config.ts', 'tailwind.config.js', '.env.example'];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      try {
        configs[c] = fs.readFileSync(c, 'utf-8').slice(0, 2000);
      } catch { /* skip */ }
    }
  }
  return configs;
}

export async function recoverCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Recovery');

  const state = new StateManager();
  const project = state.getProject();

  startAgent('Doctor', 'Scanning repository structure...');
  const files = scanRepoStructure(process.cwd(), 3);
  succeedAgent(`Found ${files.length} files/dirs`);

  startAgent('Architect', 'Reading configuration files...');
  const configs = readKeyConfigs();
  succeedAgent(`Read ${Object.keys(configs).length} config files`);

  startAgent('PM', 'Rebuilding project context...');

  try {
    const llmConfig = getLLMConfig();
    const provider = createProvider(llmConfig);

    const context = {
      hasProject: !!project,
      projectName: project?.name || 'Unnamed',
      projectIdea: project?.idea || 'Not defined',
      projectStack: project?.stack || 'Unknown',
      projectPhase: project?.sprintPhase || 'unknown',
      storedHealth: project?.healthScore || null,
      fileStructure: files.slice(0, 50),
      configs,
      totalFilesFound: files.length,
    };

    const recovery = await streamMarkdownResponse(provider, {
      messages: [
        {
          role: 'system',
          content: `You are a recovery specialist. Analyze this project state and generate a recovery report.

Based on the file structure and configs, provide:
1. **Project Identity** — what is this project? (detect from package.json, configs)
2. **Tech Stack Detected** — frameworks, languages, tools found
3. **Current State** — what's built, what's missing
4. **Recovery Actions** — specific commands/files to restore context
5. **Recommended Next Step** — the single most important thing to do

Be concise. Use markdown. Under 400 words.`,
        },
        {
          role: 'user',
          content: JSON.stringify(context, null, 2),
        },
      ],
      temperature: 0.2,
      maxTokens: 2000,
    }, 'Recovery Report');

    succeedAgent('Context rebuilt');
    console.log('');

    // If project exists, update its state
    if (project) {
      state.updateProject({
        events: [
          ...(project.events || []),
          {
            type: 'recovery',
            description: 'Project context recovered via ct recover',
            timestamp: new Date().toISOString(),
          },
        ],
      });
    }

    return { success: true, message: 'Recovery complete', data: { recovery } };
  } catch (error) {
    failAgent(error instanceof Error ? error.message : 'Recovery failed');
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Recovery failed' };
  }
}
