import chalk from 'chalk';

export function renderMarkdown(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Code block markers - pass through
    if (trimmed.startsWith('```')) {
      result.push(chalk.hex('#899691')(line));
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      result.push(chalk.hex('#74d7ff').bold(line));
      continue;
    }
    if (trimmed.startsWith('## ')) {
      result.push(chalk.hex('#f7fff9').bold(line));
      continue;
    }
    if (trimmed.startsWith('# ')) {
      result.push(chalk.hex('#ffcf5c').bold(line));
      continue;
    }

    // Horizontal rule
    if (/^-{3,}$/.test(trimmed)) {
      result.push(chalk.hex('#899691')('\u2500'.repeat(50)));
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      result.push(chalk.hex('#899691')('\u2502') + '  ' + chalk.hex('#74d7ff')('\u2022') + ' ' + renderInline(trimmed.slice(2)));
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+\.\s)(.*)/);
      if (match) {
        result.push(chalk.hex('#899691')('\u2502') + '  ' + chalk.hex('#74d7ff')(match[1]) + renderInline(match[2]));
        continue;
      }
    }

    // Blockquotes
    if (trimmed.startsWith('> ')) {
      result.push(chalk.hex('#899691')('\u2502') + '  ' + chalk.hex('#899691').italic(trimmed.slice(2)));
      continue;
    }

    // Code blocks (inline)
    if (trimmed.startsWith('    ') || trimmed.startsWith('\t')) {
      result.push(chalk.hex('#899691')('\u2502') + '  ' + chalk.hex('#899691')(line));
      continue;
    }

    // Regular text
    result.push(chalk.hex('#899691')('\u2502') + '  ' + renderInline(line));
  }

  return result.join('\n');
}

function renderInline(text: string): string {
  let result = text;

  // Bold (**text** or __text__)
  result = result.replace(/\*\*(.+?)\*\*/g, (_, content) => chalk.hex('#f7fff9').bold(content));
  result = result.replace(/__(.+?)__/g, (_, content) => chalk.hex('#f7fff9').bold(content));

  // Inline code (`code`)
  result = result.replace(/`([^`]+)`/g, (_, code) => chalk.hex('#74d7ff')(code));

  // Italic (*text*)
  result = result.replace(/\*(.+?)\*/g, (_, content) => chalk.hex('#e0e6e1').italic(content));

  // Links [text](url)
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, (_, text) => chalk.hex('#74d7ff').underline(text));

  // Strikethrough
  result = result.replace(/~~(.+?)~~/g, (_, content) => chalk.hex('#899691').strikethrough(content));

  return result;
}
