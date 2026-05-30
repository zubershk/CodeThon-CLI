export function stripAnsi(text: string): string {
  return text.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

export function truncateText(text: string, width: number): string {
  const plain = stripAnsi(text);
  if (width <= 0) return '';
  if (plain.length <= width) return plain;
  if (width === 1) return '…';
  return plain.slice(0, width - 1) + '…';
}

export function wrapText(text: string, width: number): string[] {
  const plain = stripAnsi(text).replace(/\r/g, '');
  if (width <= 0) return [''];

  const sourceLines = plain.split('\n');
  const wrapped: string[] = [];

  for (const line of sourceLines) {
    if (!line) {
      wrapped.push('');
      continue;
    }

    let remaining = line;
    while (remaining.length > width) {
      let splitAt = remaining.lastIndexOf(' ', width);
      if (splitAt <= 0) splitAt = width;
      wrapped.push(remaining.slice(0, splitAt).trimEnd());
      remaining = remaining.slice(splitAt).trimStart();
    }
    wrapped.push(remaining);
  }

  return wrapped.length > 0 ? wrapped : [''];
}

export interface PromptLayout {
  lines: string[];
  cursorRow: number;
  cursorCol: number;
}

export function buildPromptLayout(input: string, cursorPos: number, terminalWidth: number, promptWidth: number): PromptLayout {
  const safeWidth = Math.max(8, terminalWidth);
  const lines: string[] = [];
  let current = '';
  let row = 0;
  let col = 0;
  let cursorRow = 0;
  let cursorCol = promptWidth;

  const charsBeforeCursor = Math.max(0, Math.min(cursorPos, input.length));

  const flushLine = () => {
    lines.push(current);
    current = '';
    row++;
    col = 0;
  };

  for (let i = 0; i <= input.length; i++) {
    if (i === charsBeforeCursor) {
      cursorRow = row;
      cursorCol = row === 0 ? promptWidth + col : col;
    }

    if (i === input.length) break;

    const char = input[i];
    if (char === '\n') {
      flushLine();
      continue;
    }

    const lineWidth = row === 0 ? safeWidth - promptWidth : safeWidth;
    if (lineWidth <= 0) {
      lines.push('');
      row++;
      col = 0;
    }

    current += char;
    col++;

    const maxWidth = row === 0 ? safeWidth - promptWidth : safeWidth;
    if (maxWidth > 0 && col >= maxWidth) {
      flushLine();
    }
  }

  lines.push(current);

  if (charsBeforeCursor === input.length) {
    cursorRow = row;
    cursorCol = row === 0 ? promptWidth + col : col;
  }

  return {
    lines,
    cursorRow,
    cursorCol,
  };
}
