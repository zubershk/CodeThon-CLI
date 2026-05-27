import https from 'https';
import http from 'http';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface CrawledPage {
  url: string;
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  text: string;
  links: { text: string; href: string }[];
}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function fetchUrl(url: string): Promise<{ body: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 20000,
    }, (res) => {
      const ct = res.headers['content-type'] || '';
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve({ body, contentType: Array.isArray(ct) ? ct[0] : ct });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#?\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSearchResults(html: string, engine: 'ddg' | 'bing'): SearchResult[] {
  const results: SearchResult[] = [];

  if (engine === 'ddg') {
    const blockRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    const urls: string[] = [];
    const titles: string[] = [];
    const snippets: string[] = [];

    let m: RegExpExecArray | null;
    while ((m = blockRegex.exec(html)) !== null) {
      let url = m[1];
      if (url.startsWith('//')) url = 'https:' + url;
      urls.push(url);
      titles.push(stripTags(m[2]).trim());
    }
    while ((m = snippetRegex.exec(html)) !== null) {
      snippets.push(stripTags(m[1]).trim());
    }
    for (let i = 0; i < Math.min(urls.length, 10); i++) {
      results.push({ title: titles[i] || `Result ${i + 1}`, url: urls[i], snippet: snippets[i] || '' });
    }
  } else {
    const liRegex = /<li[^>]*class="b_algo"[^>]*>([\s\S]*?)<\/li>/gi;
    let m: RegExpExecArray | null;
    while ((m = liRegex.exec(html)) !== null) {
      const item = m[1];
      const tMatch = item.match(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
      const sMatch = item.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      if (tMatch) {
        results.push({
          title: stripTags(tMatch[2]).trim(),
          url: tMatch[1],
          snippet: sMatch ? stripTags(sMatch[1]).trim() : '',
        });
      }
      if (results.length >= 10) break;
    }
  }

  return results;
}

export async function searchWeb(query: string): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query);

  // Try DuckDuckGo first
  try {
    const { body } = await fetchUrl(`https://html.duckduckgo.com/html/?q=${encoded}`);
    const results = extractSearchResults(body, 'ddg');
    if (results.length > 0) return results;
  } catch { /* fall through */ }

  // Fallback to Bing
  try {
    const { body } = await fetchUrl(`https://www.bing.com/search?q=${encoded}`);
    const results = extractSearchResults(body, 'bing');
    if (results.length > 0) return results;
  } catch { /* both failed */ }

  return [];
}

export async function crawlUrl(url: string): Promise<CrawledPage> {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const { body, contentType } = await fetchUrl(url);

    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return { url, title: '', description: `[Non-HTML content: ${contentType}]`, headings: [], paragraphs: [], text: '', links: [] };
    }

    const title = extractTitle(body);
    const description = extractMeta(body, 'description') || extractMeta(body, 'og:description') || '';
    const headings = extractAll(body, /<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi);
    const paragraphs = extractAll(body, /<p[^>]*>([\s\S]*?)<\/p>/gi).filter(p => p.length > 20);
    const links = extractLinks(body, url);

    const meaningfulText = [
      title ? `# ${title}` : '',
      description ? `> ${description}` : '',
      ...headings.map(h => `## ${h}`),
      ...paragraphs.map(p => p),
    ].filter(Boolean).join('\n\n').slice(0, 8000);

    return { url, title, description, headings, paragraphs, text: meaningfulText, links };
  } catch (e: any) {
    return { url, title: '', description: `Failed to fetch: ${e.message}`, headings: [], paragraphs: [], text: '', links: [] };
  }
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripTags(m[1]).trim() : '';
}

function extractMeta(html: string, name: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${name}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return stripTags(m[1]).trim();
  }
  return '';
}

function extractAll(html: string, regex: RegExp): string[] {
  const results: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    const text = stripTags(m[1]).trim();
    if (text.length > 0) results.push(text);
  }
  return results;
}

function extractLinks(html: string, baseUrl: string): { text: string; href: string }[] {
  const links: { text: string; href: string }[] = [];
  const aRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = aRegex.exec(html)) !== null) {
    const href = m[1].trim();
    const text = stripTags(m[2]).trim();
    if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      links.push({ text, href });
    }
  }
  return links.slice(0, 30);
}
