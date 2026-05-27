import fs from 'fs';
import path from 'path';
import type { CommandResult } from '@codethon/shared-types';
import { createProvider } from '@codethon/llm-client';
import { getLLMConfig } from '../utils/config';
import { startAgent, succeedAgent, failAgent } from '../utils/agent-feed';
import { logger } from '../utils';
import { renderAgentOutput } from '../utils/render';

export async function explainCommand(filePath: string): Promise<CommandResult> {
  logger.section(`CodeThon CLI — Explain: ${filePath}`);

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) {
    logger.error(`File not found: ${filePath}`);
    return { success: false, message: `File not found: ${filePath}` };
  }

  startAgent('Architect', `Analyzing ${filePath}...`);

  try {
    const content = fs.readFileSync(resolved, 'utf-8').slice(0, 8000);
    const ext = path.extname(filePath);
    const lang = ext.replace('.', '') || 'text';

    const config = getLLMConfig();
    const provider = createProvider(config);

    const response = await provider.generate({
      messages: [
        {
          role: 'system',
          content: `You are a senior software engineer explaining code. Be precise and concise.

Analyze this file and provide:
1. **Purpose** — what this file does (1-2 sentences)
2. **Architecture Role** — how it fits into the project
3. **Key Functions/Exports** — what it exposes
4. **Dependencies** — what it imports and why
5. **Potential Risks** — what could break
6. **Optimization Ideas** — how to improve it

Format with markdown headings and bullet points. Keep it under 500 words.`,
        },
        {
          role: 'user',
          content: `\`\`\`${lang}\n${content}\n\`\`\``,
        },
      ],
      temperature: 0.2,
      maxTokens: 2000,
    });

    succeedAgent(`Analysis complete for ${filePath}`);
    console.log('');
    renderAgentOutput(response.content);
    console.log('');

    return { success: true, message: 'File explained', data: { file: filePath, analysis: response.content } };
  } catch (error) {
    failAgent(error instanceof Error ? error.message : 'Analysis failed');
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Failed to analyze file' };
  }
}
