import { createProvider } from '@codethon/llm-client';
import type { LLMMessage } from '@codethon/llm-client';
import { getLLMConfig, validateProviderConfig } from '../utils/config';
import { StateManager } from '../cil/state-manager';
import { logger, createSpinner } from '../utils';
import { streamMarkdownResponse } from '../utils/llm-stream';
import { searchWeb, crawlUrl } from '../utils/web-search';
import { formatApiError } from '../utils/api-error';

function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s,)]+)/gi;
  const matches = text.match(urlRegex);
  return matches ? [...new Set(matches)] : [];
}

export async function naturalLanguageCommand(input: string) {
  logger.section('CodeThon CLI — Query');

  const state = new StateManager();
  const project = state.getProject();
  const context = project
    ? `Current project: "${project.idea}"\nStack: ${project.stack}\nTimeline: ${project.timeline}\nPhase: ${project.sprintPhase}`
    : 'No active project. Run `/init` inside ct, or `ct init` from your shell to start one.';

  // Gather web intelligence
  const urls = extractUrls(input);
  let webContent = '';

  if (urls.length > 0) {
    const spinner = createSpinner(`Crawling ${urls[0]}...`);
    spinner.start();
    try {
      const page = await crawlUrl(urls[0]);
      if (page.text) {
        webContent += `\n\n--- Page Content from ${page.url} ---\n${page.text}`;
        spinner.succeed(`Fetched: ${page.title || urls[0]}`);
      } else {
        spinner.info('Page returned no content');
      }
    } catch {
      spinner.info('Could not fetch page');
    }
  }

  // Always search as well
  const searchSpinner = createSpinner('Searching the web...');
  searchSpinner.start();
  try {
    const results = await searchWeb(input);
    if (results.length > 0) {
      webContent += '\n\n--- Web Search Results ---\n';
      for (const r of results.slice(0, 5)) {
        webContent += `\n[${r.title}](${r.url})\n${r.snippet}\n`;
      }
      searchSpinner.succeed('Web search complete');
    } else {
      searchSpinner.info('No search results');
    }
  } catch {
    searchSpinner.info('Web search failed');
  }

  const spinner = createSpinner('Analyzing...');
  spinner.start();

  try {
    const check = validateProviderConfig();
    if (!check.ok) { spinner.fail(check.message); return { success: false, message: check.message, data: null }; }
    const config = getLLMConfig();
    const provider = createProvider(config);

    const systemContent = webContent
      ? `You are CodeThon CLI, a hackathon copilot with live web access.

${context}

I fetched live web content to answer the user's query. Use this real data in your response. Be specific and cite sources.

Web Intelligence:
${webContent}

Respond naturally, be concise, and use markdown formatting (**, ##, -, \`\`\`) — it will be rendered properly.`
      : `You are CodeThon CLI, a hackathon copilot.

${context}

Respond naturally but be concise and actionable. Use markdown formatting.

If the user asks about something you don't know, ask if they want you to search the web or crawl a specific URL.`;

    const messages: LLMMessage[] = [
      { role: 'system', content: systemContent },
      { role: 'user', content: input },
    ];

    spinner.stop();
    console.log('');
    const response = await streamMarkdownResponse(provider, { messages, temperature: 0.3, maxTokens: 4000 }, 'Answer');
    console.log('');

    return { success: true, message: 'Query answered', data: { response } };
  } catch (error) {
    spinner.fail('Failed to process query');
    const config = getLLMConfig();
    const friendly = formatApiError(error, config.provider);
    logger.error(friendly);
    return { success: false, message: 'Query failed' };
  }
}
