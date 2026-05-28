import { createProvider } from '@codethon/llm-client';
import type { LLMMessage } from '@codethon/llm-client';
import { getLLMConfig } from '../utils/config';
import { StateManager } from '../cil/state-manager';
import { logger, createSpinner } from '../utils';
import { renderAgentOutput } from '../utils/render';
import { searchWeb, crawlUrl } from '../utils/web-search';

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
    : 'No active project. Run `ct init` to start one.';

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

    const response = await provider.generate({ messages, temperature: 0.3, maxTokens: 4000 });
    spinner.succeed('Done');
    console.log('');
    renderAgentOutput(response.content);
    console.log('');

    return { success: true, message: 'Query answered', data: { response: response.content } };
  } catch (error) {
    spinner.fail('Failed to process query');
    logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Query failed' };
  }
}
