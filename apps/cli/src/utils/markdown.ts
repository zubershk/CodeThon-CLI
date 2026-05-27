import chalk from 'chalk';

export function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Code block markers - pass through
    if (trimmed.startsWith('```')) {
      result.push(chalk.dim(line));
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      result.push(chalk.bold.cyanBright(line));
      continue;
    }
    if (trimmed.startsWith('## ')) {
      result.push(chalk.bold.whiteBright(line));
      continue;
    }
    if (trimmed.startsWith('# ')) {
      result.push(chalk.bold.yellowBright(line));
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      result.push(chalk.dim('\u2500'.repeat(50)));
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      result.push(chalk.dim('\u2502') + '  ' + chalk.cyanBright('\u2022') + ' ' + renderInline(trimmed.slice(2)));
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.\s)(.*)/);
      if (match) {
        result.push(chalk.dim('\u2502') + '  ' + chalk.cyanBright(match[1]) + renderInline(match[2]));
        continue;
      }
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      result.push(chalk.dim('\u2502') + '  ' + chalk.italic.gray(trimmed.slice(2)));
      continue;
    }

    // Code blocks (inline)
    if (trimmed.startsWith('    ') || trimmed.startsWith('\t')) {
      result.push(chalk.dim('\u2502') + '  ' + chalk.gray(line));
      continue;
    }

    // Regular text
    result.push(chalk.dim('\u2502') + '  ' + renderInline(line));
  }

  return result.join('\n');
}

function renderInline(text: string): string {
  let result = text;

  // Bold (**text** or __text__)
  result = result.replace(/\*\*(.+?)\*\*/g, (_, content) => chalk.bold.whiteBright(content));
  result = result.replace(/__(.+?)__/g, (_, content) => chalk.bold.whiteBright(content));

  // Inline code (`code`)
  result = result.replace(/`([^`]+)`/g, (_, code) => chalk.cyan(code));

  // Italic (*text*)
  result = result.replace(/\*(.+?)\*/g, (_, content) => chalk.italic(content));

  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, (_, text) => chalk.underline.cyanBright(text));

  // Strikethrough
  result = result.replace(/~~(.+?)~~/g, (_, content) => chalk.strikethrough.gray(content));

  return result;
}
