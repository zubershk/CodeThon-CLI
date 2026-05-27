import chalk from 'chalk';

export function renderAgentOutput(content: string): void {
  const lines = content.split('\n');
  let inCodeBlock = false;
  let codeLang = '';
  let codeLines: string[] = [];

  const flushCodeBlock = () => {
    if (codeLines.length === 0) return;
    const header = codeLang ? chalk.bold.cyanBright(codeLang) : 'code';
    console.log(`  ${chalk.cyan('\u250C')}${chalk.cyan('\u2500')} ${header} ${chalk.dim('\u2500'.repeat(Math.max(2, 44 - codeLang.length)))}`);
    for (const cl of codeLines) {
      console.log(`  ${chalk.cyan('\u2502')} ${chalk.whiteBright(cl)}`);
    }
    console.log(`  ${chalk.cyan('\u2514')}${chalk.cyan('\u2500'.repeat(50))}`);
    codeLines = [];
    codeLang = '';
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmedStart = line.trimStart();

    if (trimmedStart.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        flushCodeBlock();
        inCodeBlock = true;
        codeLang = trimmedStart.replace(/^```/, '').trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      console.log('');
      continue;
    }

    if (trimmed.startsWith('### ')) {
      console.log(`  ${chalk.bold.cyanBright(trimmed)}`);
      continue;
    }
    if (trimmed.startsWith('## ')) {
      console.log(`  ${chalk.bold.whiteBright(trimmed)}`);
      continue;
    }
    if (trimmed.startsWith('# ')) {
      console.log(`  ${chalk.bold.yellowBright(trimmed)}`);
      continue;
    }

    if (/^-{3,}$/.test(trimmed)) {
      console.log(`  ${chalk.dim('\u2500'.repeat(50))}`);
      continue;
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('\u2022')} ${renderInline(trimmed.slice(2))}`);
      continue;
    }

    if (/^\d+[\.\)]\s/.test(trimmed)) {
      const match = trimmed.match(/^(\d+[\.\)]\s)(.*)/);
      if (match) {
        console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright(match[1])} ${renderInline(match[2])}`);
        continue;
      }
    }

    if (trimmed.startsWith('> ')) {
      console.log(`  ${chalk.dim('\u2502')}  ${chalk.italic.gray(trimmed.slice(2))}`);
      continue;
    }

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      console.log(`  ${chalk.dim('\u2502')}  ${chalk.bold.magentaBright(trimmed)}`);
      continue;
    }

    console.log(`  ${chalk.dim('\u2502')} ${renderInline(line)}`);
  }

  flushCodeBlock();
}

function renderInline(text: string): string {
  let result = text;
  result = result.replace(/\*\*(.+?)\*\*/g, (_, c) => chalk.bold.whiteBright(c));
  result = result.replace(/__(.+?)__/g, (_, c) => chalk.bold.whiteBright(c));
  result = result.replace(/`([^`]+)`/g, (_, c) => chalk.cyan(c));
  result = result.replace(/\*(.+?)\*/g, (_, c) => chalk.italic(c));
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, (_, t) => chalk.underline.cyanBright(t));
  result = result.replace(/~~(.+?)~~/g, (_, c) => chalk.strikethrough.gray(c));
  return result;
}

export function resultSummary(title: string, items: string[]): void {
  console.log(`  ${chalk.bold.greenBright('\u2501'.repeat(50))}`);
  console.log(`  ${chalk.bold.greenBright('\u25C6')}  ${chalk.bold.whiteBright(title)}`);
  console.log(`  ${chalk.bold.greenBright('\u2501'.repeat(50))}`);
  for (const item of items) {
    console.log(`  ${chalk.dim('\u2502')}  ${chalk.cyanBright('\u2022')} ${chalk.whiteBright(item)}`);
  }
  console.log(`  ${chalk.bold.greenBright('\u2501'.repeat(50))}`);
}
