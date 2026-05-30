import chalk from 'chalk';
import { stripAnsi, truncateText, wrapText } from '../ui/terminal-text';

interface RenderOptions {
  title?: string;
  maxWidth?: number;
}

type ColorFn = (value: string) => string;

export interface MarkdownStreamRenderer {
  write(token: string): void;
  end(): void;
}

function terminalWidth(maxWidth?: number): number {
  const columns = process.stdout.columns || 88;
  return Math.max(48, Math.min(maxWidth || 92, columns - 4));
}

function cleanControlNoise(content: string): string {
  return content
    .replace(/\r/g, '')
    .split('\n')
    .filter(line => !line.trim().startsWith('TOOL_CALL:'))
    .join('\n')
    .replace(/^DONE:\s*/i, '')
    .trim();
}

function plainMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/\*(.+?)\*/g, '$1');
}

function renderInline(text: string): string {
  let result = text;
  result = result.replace(/\*\*(.+?)\*\*/g, (_, c) => chalk.bold.whiteBright(c));
  result = result.replace(/__(.+?)__/g, (_, c) => chalk.bold.whiteBright(c));
  result = result.replace(/`([^`]+)`/g, (_, c) => chalk.cyanBright(c));
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, (_, t) => chalk.underline.cyanBright(t));
  result = result.replace(/~~(.+?)~~/g, (_, c) => chalk.strikethrough.gray(c));
  result = result.replace(/\*(.+?)\*/g, (_, c) => chalk.italic(c));
  return result;
}

function printWrapped(text: string, options: {
  width: number;
  prefix?: string;
  continuationPrefix?: string;
  color?: ColorFn;
}): void {
  const prefix = options.prefix ?? `  ${chalk.dim('│')} `;
  const continuationPrefix = options.continuationPrefix ?? prefix;
  const firstPrefixWidth = stripAnsi(prefix).length;
  const contPrefixWidth = stripAnsi(continuationPrefix).length;
  const plain = plainMarkdown(text.trim());
  const firstWidth = Math.max(16, options.width - firstPrefixWidth);
  const contWidth = Math.max(16, options.width - contPrefixWidth);
  const firstLines = wrapText(plain, firstWidth);

  firstLines.forEach((line, index) => {
    const raw = index === 0 ? line : wrapText(line, contWidth)[0] || '';
    const rendered = renderInline(raw);
    const color = options.color || ((value: string) => value);
    process.stdout.write(`${index === 0 ? prefix : continuationPrefix}${color(rendered)}\n`);
  });
}

function printParagraph(lines: string[], width: number): void {
  const text = lines.map(line => line.trim()).join(' ').replace(/\s+/g, ' ').trim();
  if (!text) return;
  printWrapped(text, { width, color: chalk.whiteBright });
}

function printHeading(raw: string, level: number, width: number): void {
  const title = plainMarkdown(raw.replace(/^#{1,6}\s*/, '').trim());
  if (!title) return;

  if (level <= 1) {
    const line = chalk.cyanBright('─'.repeat(Math.min(width, Math.max(44, title.length + 8))));
    console.log('');
    console.log(`  ${chalk.bold.cyanBright('◆')} ${chalk.bold.whiteBright(title)}`);
    console.log(`  ${line}`);
    return;
  }

  if (level === 2) {
    console.log('');
    console.log(`  ${chalk.bold.magentaBright('▸')} ${chalk.bold.whiteBright(title)}`);
    return;
  }

  console.log('');
  console.log(`  ${chalk.cyanBright('•')} ${chalk.bold.whiteBright(title)}`);
}

function printRule(width: number): void {
  console.log(`  ${chalk.dim('─'.repeat(Math.min(width, 72)))}`);
}

function printListItem(raw: string, width: number): void {
  const trimmed = raw.trim();
  const unordered = trimmed.match(/^[-*•]\s+(.*)$/);
  if (unordered) {
    printWrapped(unordered[1], {
      width,
      prefix: `  ${chalk.dim('│')} ${chalk.cyanBright('•')} `,
      continuationPrefix: `  ${chalk.dim('│')}   `,
      color: chalk.whiteBright,
    });
    return;
  }

  const ordered = trimmed.match(/^(\d+)[.)]\s+(.*)$/);
  if (ordered) {
    const marker = `${ordered[1]}.`;
    printWrapped(ordered[2], {
      width,
      prefix: `  ${chalk.dim('│')} ${chalk.cyanBright(marker.padStart(3, ' '))} `,
      continuationPrefix: `  ${chalk.dim('│')}     `,
      color: chalk.whiteBright,
    });
  }
}

function printQuote(raw: string, width: number): void {
  const text = raw.replace(/^>\s?/, '').trim();
  printWrapped(text, {
    width,
    prefix: `  ${chalk.dim('┃')} `,
    continuationPrefix: `  ${chalk.dim('┃')} `,
    color: chalk.gray,
  });
}

function printCodeBlock(lines: string[], lang: string, width: number): void {
  const label = lang ? chalk.bold.cyanBright(lang) : chalk.bold.cyanBright('code');
  const boxWidth = Math.min(width, Math.max(44, Math.min(96, width)));
  const innerWidth = Math.max(20, boxWidth - 4);
  console.log('');
  console.log(`  ${chalk.cyan('┌')} ${label} ${chalk.cyan('─'.repeat(Math.max(2, innerWidth - stripAnsi(label).length - 1)))}`);
  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    const wrapped = line.length > innerWidth ? [truncateText(line, innerWidth)] : [line];
    for (const part of wrapped) {
      console.log(`  ${chalk.cyan('│')} ${chalk.whiteBright(part)}`);
    }
  }
  console.log(`  ${chalk.cyan('└')}${chalk.cyan('─'.repeat(innerWidth + 2))}`);
}

function printCodeBlockStart(lang: string, width: number): { innerWidth: number } {
  const label = lang ? chalk.bold.cyanBright(lang) : chalk.bold.cyanBright('code');
  const boxWidth = Math.min(width, Math.max(44, Math.min(96, width)));
  const innerWidth = Math.max(20, boxWidth - 4);
  console.log('');
  console.log(`  ${chalk.cyan('┌')} ${label} ${chalk.cyan('─'.repeat(Math.max(2, innerWidth - stripAnsi(label).length - 1)))}`);
  return { innerWidth };
}

function printCodeBlockLine(raw: string, innerWidth: number): void {
  const line = raw.replace(/\t/g, '  ');
  const wrapped = line.length > innerWidth ? [truncateText(line, innerWidth)] : [line];
  for (const part of wrapped) {
    console.log(`  ${chalk.cyan('│')} ${chalk.whiteBright(part)}`);
  }
}

function printCodeBlockEnd(innerWidth: number): void {
  console.log(`  ${chalk.cyan('└')}${chalk.cyan('─'.repeat(innerWidth + 2))}`);
}

function renderCompletedMarkdownLine(raw: string, width: number, streamState: {
  inCodeBlock: boolean;
  codeInnerWidth: number;
}): void {
  const line = raw.replace(/\r/g, '').trimEnd();
  let trimmed = line.trim();

  if (!trimmed) {
    console.log('');
    return;
  }

  if (trimmed.startsWith('TOOL_CALL:')) return;
  trimmed = trimmed.replace(/^DONE:\s*/i, '').trim();
  if (!trimmed) return;

  if (trimmed.startsWith('```')) {
    if (streamState.inCodeBlock) {
      printCodeBlockEnd(streamState.codeInnerWidth);
      streamState.inCodeBlock = false;
      streamState.codeInnerWidth = 0;
    } else {
      const lang = trimmed.replace(/^```/, '').trim();
      const block = printCodeBlockStart(lang, width);
      streamState.inCodeBlock = true;
      streamState.codeInnerWidth = block.innerWidth;
    }
    return;
  }

  if (streamState.inCodeBlock) {
    printCodeBlockLine(line, streamState.codeInnerWidth);
    return;
  }

  const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
  if (heading) {
    printHeading(trimmed, heading[1].length, width);
    return;
  }

  if (/^-{3,}$/.test(trimmed)) {
    printRule(width);
    return;
  }

  if (/^[-*•]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
    printListItem(trimmed, width);
    return;
  }

  if (trimmed.startsWith('> ')) {
    printQuote(trimmed, width);
    return;
  }

  printWrapped(trimmed, { width, color: chalk.whiteBright });
}

export function createMarkdownStreamRenderer(options: RenderOptions = {}): MarkdownStreamRenderer {
  const width = terminalWidth(options.maxWidth);
  let buffer = '';
  let ended = false;
  const state = {
    inCodeBlock: false,
    codeInnerWidth: 0,
  };

  if (options.title) {
    printHeading(options.title, 1, width);
  }

  const flushCompletedLines = () => {
    const normalized = buffer.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      renderCompletedMarkdownLine(line, width, state);
    }
  };

  return {
    write(token: string): void {
      if (ended || !token) return;
      buffer += token;
      flushCompletedLines();
    },
    end(): void {
      if (ended) return;
      ended = true;
      if (buffer.trim()) {
        renderCompletedMarkdownLine(buffer, width, state);
      }
      buffer = '';
      if (state.inCodeBlock) {
        printCodeBlockEnd(state.codeInnerWidth);
        state.inCodeBlock = false;
      }
    },
  };
}

export function renderAgentOutput(content: string, options: RenderOptions = {}): void {
  const clean = cleanControlNoise(content);
  if (!clean) return;

  const width = terminalWidth(options.maxWidth);
  const lines = clean.split('\n');
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    printParagraph(paragraph, width);
    paragraph = [];
  };

  const flushCodeBlock = () => {
    if (!inCodeBlock && codeLines.length === 0) return;
    printCodeBlock(codeLines, codeLang, width);
    codeLines = [];
    codeLang = '';
  };

  if (options.title) {
    printHeading(options.title, 1, width);
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushParagraph();
        inCodeBlock = true;
        codeLang = trimmed.replace(/^```/, '').trim();
        codeLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      console.log('');
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      printHeading(trimmed, heading[1].length, width);
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      flushParagraph();
      printRule(width);
      continue;
    }

    if (/^[-*•]\s+/.test(trimmed) || /^\d+[.)]\s+/.test(trimmed)) {
      flushParagraph();
      printListItem(trimmed, width);
      continue;
    }

    if (trimmed.startsWith('> ')) {
      flushParagraph();
      printQuote(trimmed, width);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  if (inCodeBlock || codeLines.length > 0) flushCodeBlock();
}

export function resultSummary(title: string, items: string[]): void {
  const width = terminalWidth();
  const line = chalk.bold.greenBright('─'.repeat(Math.min(width, 72)));
  console.log('');
  console.log(`  ${chalk.bold.greenBright('◆')}  ${chalk.bold.whiteBright(title)}`);
  console.log(`  ${line}`);
  for (const item of items) {
    printWrapped(item, {
      width,
      prefix: `  ${chalk.dim('│')} ${chalk.cyanBright('•')} `,
      continuationPrefix: `  ${chalk.dim('│')}   `,
      color: chalk.whiteBright,
    });
  }
  console.log(`  ${line}`);
}
