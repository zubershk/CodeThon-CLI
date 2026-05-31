import readline from 'readline';
import inquirer from 'inquirer';
import chalk from 'chalk';

export class PromptCancelledError extends Error {
  constructor(message = 'Prompt cancelled') {
    super(message);
    this.name = 'PromptCancelledError';
  }
}

export interface PromptChoice<T = string> {
  name: string;
  value: T;
  short?: string;
}

export interface PromptSeparator {
  separator: string;
}

export type SimpleChoice<T = string> = PromptChoice<T> | PromptSeparator;

function useSimplePrompts(): boolean {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return true;
  if (process.env.CODETHON_SIMPLE_PROMPTS === '1') return true;
  return process.platform === 'win32';
}

let lineReaderAttached = false;
let keypressEventsAttached = false;
let lineBuffer = '';
const queuedLines: string[] = [];
let pendingLine:
  | {
      resolve: (value: string) => void;
      reject: (error: Error) => void;
      onSigInt: () => void;
    }
  | null = null;

function flushQueuedLines(): void {
  if (!pendingLine || queuedLines.length === 0) return;
  const line = queuedLines.shift() ?? '';
  const current = pendingLine;
  pendingLine = null;
  process.removeListener('SIGINT', current.onSigInt);
  current.resolve(line);
}

function onLineReaderData(chunk: Buffer | string): void {
  const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
  lineBuffer += text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  let newlineIndex = lineBuffer.indexOf('\n');
  while (newlineIndex >= 0) {
    const line = lineBuffer.slice(0, newlineIndex);
    lineBuffer = lineBuffer.slice(newlineIndex + 1);
    queuedLines.push(line);
    flushQueuedLines();
    newlineIndex = lineBuffer.indexOf('\n');
  }
}

function onLineReaderEnd(): void {
  if (!pendingLine) return;
  const current = pendingLine;
  pendingLine = null;
  process.removeListener('SIGINT', current.onSigInt);
  current.reject(new PromptCancelledError('Input ended'));
}

function attachLineReader(): void {
  if (lineReaderAttached) return;
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', onLineReaderData);
  process.stdin.on('end', onLineReaderEnd);
  process.stdin.resume();
  lineReaderAttached = true;
}

function detachLineReader(): void {
  if (!lineReaderAttached) return;
  process.stdin.off('data', onLineReaderData);
  process.stdin.off('end', onLineReaderEnd);
  lineReaderAttached = false;
}

function enableKeypressEvents(): void {
  if (keypressEventsAttached) return;
  readline.emitKeypressEvents(process.stdin);
  keypressEventsAttached = true;
}

export function resetSimplePromptSession(): void {
  detachLineReader();
  lineBuffer = '';
  queuedLines.length = 0;
  if (!pendingLine) return;
  const current = pendingLine;
  pendingLine = null;
  process.removeListener('SIGINT', current.onSigInt);
  current.reject(new PromptCancelledError());
}

async function readLine(question: string): Promise<string> {
  attachLineReader();
  process.stdout.write(question);

  if (queuedLines.length > 0) {
    return queuedLines.shift() ?? '';
  }

  return await new Promise<string>((resolve, reject) => {
    const onSigInt = () => {
      if (pendingLine?.onSigInt !== onSigInt) return;
      pendingLine = null;
      process.removeListener('SIGINT', onSigInt);
      reject(new PromptCancelledError());
    };

    pendingLine = { resolve, reject, onSigInt };
    process.once('SIGINT', onSigInt);
  });
}

export async function promptLine(prompt: string): Promise<string> {
  return readLine(prompt);
}

function isCancelAnswer(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  return trimmed === 'q' || trimmed === 'quit' || trimmed === 'exit' || trimmed === 'esc' || trimmed === 'escape' || trimmed === '0' || value === '\u001b';
}

function normalizeChoice<T>(choice: SimpleChoice<T>): PromptChoice<T> | null {
  if ('separator' in choice) return null;
  return choice;
}

function canUseKeyboardSelect(): boolean {
  return Boolean(
    process.stdin.isTTY &&
    process.stdout.isTTY &&
    process.env.CODETHON_SIMPLE_PROMPTS !== '1' &&
    process.env.CI !== 'true',
  );
}

const ANSI_RE = /\u001b\[[0-9;]*m/g;

function stripAnsi(value: string): string {
  return value.replace(ANSI_RE, '');
}

function compactText(value: string): string {
  return stripAnsi(value).replace(/\s+/g, ' ').trim();
}

function visibleLength(value: string): number {
  return Array.from(stripAnsi(value)).length;
}

function truncateVisible(value: string, width: number): string {
  const text = compactText(value);
  const chars = Array.from(text);
  if (chars.length <= width) return text;
  if (width <= 1) return chars.slice(0, width).join('');
  return `${chars.slice(0, Math.max(0, width - 1)).join('')}…`;
}

function padVisible(value: string, width: number): string {
  const length = visibleLength(value);
  return length >= width ? value : `${value}${' '.repeat(width - length)}`;
}

function splitChoiceName<T>(choice: PromptChoice<T>): { main: string; detail?: string } {
  const lines = choice.name
    .split(/\r?\n/g)
    .map(line => compactText(line))
    .filter(Boolean);
  const fallback = choice.short ? compactText(choice.short) : String(choice.value);
  return {
    main: lines[0] || fallback,
    detail: lines.length > 1 ? lines.slice(1).join(' ') : undefined,
  };
}

function choiceLabel<T>(choice: PromptChoice<T>): string {
  return choice.short ? compactText(choice.short) : splitChoiceName(choice).main;
}

function printChoices<T>(choices: SimpleChoice<T>[]): PromptChoice<T>[] {
  const normalized: PromptChoice<T>[] = [];
  let index = 1;

  for (const choice of choices) {
    if ('separator' in choice) {
      process.stdout.write(`  ${choice.separator}\n`);
      continue;
    }
    normalized.push(choice);
    process.stdout.write(`  ${index}. ${choice.name}\n`);
    index++;
  }

  return normalized;
}

interface SelectChoiceRow<T> {
  type: 'choice';
  choice: PromptChoice<T>;
  choiceIndex: number;
}

interface SelectSeparatorRow {
  type: 'separator';
  label: string;
}

type SelectRow<T> = SelectChoiceRow<T> | SelectSeparatorRow;

function makeSelectRows<T>(choices: SimpleChoice<T>[]): {
  rows: SelectRow<T>[];
  selectable: PromptChoice<T>[];
} {
  const rows: SelectRow<T>[] = [];
  const selectable: PromptChoice<T>[] = [];

  for (const choice of choices) {
    if ('separator' in choice) {
      rows.push({ type: 'separator', label: compactText(choice.separator) });
      continue;
    }
    const choiceIndex = selectable.length;
    selectable.push(choice);
    rows.push({ type: 'choice', choice, choiceIndex });
  }

  return { rows, selectable };
}

async function readKeySelect<T>(message: string, choices: SimpleChoice<T>[]): Promise<T> {
  const { rows, selectable } = makeSelectRows(choices);
  if (selectable.length === 0) {
    throw new Error('No choices available');
  }

  detachLineReader();

  return await new Promise<T>((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = Boolean((stdin as any).isRaw);
    let selected = 0;
    let rowScroll = 0;
    let renderedLines = 0;
    let finished = false;

    const terminalWidth = stdout.columns ?? 80;
    const width = Math.max(20, Math.min(88, terminalWidth - 4));
    const innerWidth = width - 2;
    const maxRows = Math.max(
      4,
      Math.min(12, rows.length, Math.max(4, (stdout.rows ?? 24) - 8)),
    );

    const selectedRowIndex = () => rows.findIndex(row => row.type === 'choice' && row.choiceIndex === selected);

    const clampScroll = () => {
      const rowIndex = selectedRowIndex();
      if (rowIndex < 0) return;
      if (rowIndex < rowScroll) rowScroll = rowIndex;
      if (rowIndex >= rowScroll + maxRows) rowScroll = rowIndex - maxRows + 1;
      rowScroll = Math.max(0, Math.min(rowScroll, Math.max(0, rows.length - maxRows)));
    };

    const move = (delta: number) => {
      selected = Math.max(0, Math.min(selectable.length - 1, selected + delta));
      clampScroll();
      render();
    };

    const jumpTo = (next: number) => {
      selected = Math.max(0, Math.min(selectable.length - 1, next));
      clampScroll();
      render();
    };

    const clearRender = () => {
      if (renderedLines <= 0) return;
      stdout.write(`\u001b[${renderedLines}A\u001b[0J`);
      renderedLines = 0;
    };

    const boxLine = (content: string, color?: (value: string) => string) => {
      const clipped = truncateVisible(content, innerWidth);
      const padded = padVisible(clipped, innerWidth);
      return `  │${color ? color(padded) : padded}│`;
    };

    const render = () => {
      clampScroll();
      clearRender();

      const lines: string[] = [];
      const hint = chalk.hex('#899691')('Use ↑/↓, Enter to select, Esc to cancel');
      lines.push(`? ${message} ${hint}`);
      lines.push(`  ┌${'─'.repeat(innerWidth)}┐`);

      const visibleRows = rows.slice(rowScroll, rowScroll + maxRows);
      for (const row of visibleRows) {
        if (row.type === 'separator') {
          lines.push(boxLine(`  ${row.label}`, chalk.hex('#d7a3ff')));
          continue;
        }

        const isSelected = row.choiceIndex === selected;
        const { main, detail } = splitChoiceName(row.choice);
        const prefix = isSelected ? '>' : ' ';
        lines.push(boxLine(`${prefix} ${main}`, isSelected ? chalk.hex('#74d7ff') : undefined));
        if (isSelected && detail) {
          lines.push(boxLine(`  ${detail}`, chalk.hex('#899691')));
        }
      }

      if (rowScroll > 0 || rowScroll + maxRows < rows.length) {
        const top = rowScroll > 0 ? 'more above' : '';
        const bottom = rowScroll + maxRows < rows.length ? 'more below' : '';
        lines.push(boxLine(`  ${[top, bottom].filter(Boolean).join(' · ')}`, chalk.hex('#899691')));
      }

      lines.push(boxLine(`  ${selected + 1}/${selectable.length} · number keys also work`, chalk.hex('#899691')));
      lines.push(`  └${'─'.repeat(innerWidth)}┘`);

      stdout.write(`${lines.join('\n')}\n`);
      renderedLines = lines.length;
    };

    const cleanup = () => {
      stdin.removeListener('keypress', onKeypress);
      process.removeListener('SIGINT', onSigInt);
      try { stdin.setRawMode(wasRaw); } catch {}
      stdout.write('\u001b[?25h');
    };

    const finish = (value: T) => {
      if (finished) return;
      finished = true;
      clearRender();
      cleanup();
      stdout.write(`? ${message} ${chalk.hex('#74d7ff')(choiceLabel(selectable[selected]))}\n`);
      resolve(value);
    };

    const cancel = () => {
      if (finished) return;
      finished = true;
      clearRender();
      cleanup();
      stdout.write(`? ${message} ${chalk.hex('#899691')('cancelled')}\n`);
      reject(new PromptCancelledError());
    };

    const onSigInt = () => cancel();

    const onKeypress = (str: string | undefined, key: {
      name?: string;
      sequence?: string;
      ctrl?: boolean;
      shift?: boolean;
    }) => {
      const input = str ?? '';
      if (key?.ctrl && key.name === 'c') {
        cancel();
        return;
      }

      if (key?.name === 'return' || key?.name === 'enter' || input === '\r' || input === '\n') {
        finish(selectable[selected].value);
        return;
      }

      if (key?.name === 'escape' || key?.sequence === '\u001b' || input === '\u001b' || input === 'q' || input === 'Q' || input === '0') {
        cancel();
        return;
      }

      if (key?.name === 'up' || input === 'k' || input === 'K') {
        move(-1);
        return;
      }

      if (key?.name === 'down' || key?.name === 'tab' || input === 'j' || input === 'J') {
        move(1);
        return;
      }

      if (key?.name === 'pageup') {
        move(-maxRows);
        return;
      }

      if (key?.name === 'pagedown') {
        move(maxRows);
        return;
      }

      if (key?.name === 'home') {
        jumpTo(0);
        return;
      }

      if (key?.name === 'end') {
        jumpTo(selectable.length - 1);
        return;
      }

      if (/^[1-9]$/.test(input)) {
        const quickIndex = Number.parseInt(input, 10) - 1;
        if (quickIndex >= 0 && quickIndex < selectable.length) {
          jumpTo(quickIndex);
        }
      }
    };

    enableKeypressEvents();
    try { stdin.setRawMode(true); } catch {}
    stdin.resume();
    stdout.write('\u001b[?25l');
    process.once('SIGINT', onSigInt);
    stdin.on('keypress', onKeypress);
    render();
  });
}

async function readKeyMultiSelect(message: string, choices: SimpleChoice<string>[]): Promise<string[]> {
  const { rows, selectable } = makeSelectRows(choices);
  if (selectable.length === 0) {
    return [];
  }

  detachLineReader();

  return await new Promise<string[]>((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = Boolean((stdin as any).isRaw);
    let selected = 0;
    let rowScroll = 0;
    let renderedLines = 0;
    let finished = false;
    const selectedValues = new Set<string>();

    const terminalWidth = stdout.columns ?? 80;
    const width = Math.max(20, Math.min(88, terminalWidth - 4));
    const innerWidth = width - 2;
    const maxRows = Math.max(
      4,
      Math.min(12, rows.length, Math.max(4, (stdout.rows ?? 24) - 8)),
    );

    const selectedRowIndex = () => rows.findIndex(row => row.type === 'choice' && row.choiceIndex === selected);

    const clampScroll = () => {
      const rowIndex = selectedRowIndex();
      if (rowIndex < 0) return;
      if (rowIndex < rowScroll) rowScroll = rowIndex;
      if (rowIndex >= rowScroll + maxRows) rowScroll = rowIndex - maxRows + 1;
      rowScroll = Math.max(0, Math.min(rowScroll, Math.max(0, rows.length - maxRows)));
    };

    const move = (delta: number) => {
      selected = Math.max(0, Math.min(selectable.length - 1, selected + delta));
      clampScroll();
      render();
    };

    const jumpTo = (next: number) => {
      selected = Math.max(0, Math.min(selectable.length - 1, next));
      clampScroll();
      render();
    };

    const toggle = (index = selected) => {
      const value = selectable[index]?.value;
      if (!value) return;
      if (selectedValues.has(value)) {
        selectedValues.delete(value);
      } else {
        selectedValues.add(value);
      }
      render();
    };

    const clearRender = () => {
      if (renderedLines <= 0) return;
      stdout.write(`\u001b[${renderedLines}A\u001b[0J`);
      renderedLines = 0;
    };

    const boxLine = (content: string, color?: (value: string) => string) => {
      const clipped = truncateVisible(content, innerWidth);
      const padded = padVisible(clipped, innerWidth);
      return `  │${color ? color(padded) : padded}│`;
    };

    const render = () => {
      clampScroll();
      clearRender();

      const lines: string[] = [];
      const hint = chalk.hex('#899691')('Use ↑/↓, Space to toggle, Enter to continue, Esc to cancel');
      lines.push(`? ${message} ${hint}`);
      lines.push(`  ┌${'─'.repeat(innerWidth)}┐`);

      const visibleRows = rows.slice(rowScroll, rowScroll + maxRows);
      for (const row of visibleRows) {
        if (row.type === 'separator') {
          lines.push(boxLine(`  ${row.label}`, chalk.hex('#d7a3ff')));
          continue;
        }

        const isSelected = row.choiceIndex === selected;
        const isChecked = selectedValues.has(row.choice.value);
        const marker = isChecked ? '[x]' : '[ ]';
        const pointer = isSelected ? '>' : ' ';
        const { main, detail } = splitChoiceName(row.choice);
        lines.push(boxLine(`${pointer} ${marker} ${main}`, isSelected ? chalk.hex('#74d7ff') : undefined));
        if (isSelected && detail) {
          lines.push(boxLine(`    ${detail}`, chalk.hex('#899691')));
        }
      }

      if (rowScroll > 0 || rowScroll + maxRows < rows.length) {
        const top = rowScroll > 0 ? 'more above' : '';
        const bottom = rowScroll + maxRows < rows.length ? 'more below' : '';
        lines.push(boxLine(`  ${[top, bottom].filter(Boolean).join(' · ')}`, chalk.hex('#899691')));
      }

      lines.push(boxLine(`  ${selectedValues.size} selected · A all · N none · number keys toggle`, chalk.hex('#899691')));
      lines.push(`  └${'─'.repeat(innerWidth)}┘`);

      stdout.write(`${lines.join('\n')}\n`);
      renderedLines = lines.length;
    };

    const cleanup = () => {
      stdin.removeListener('keypress', onKeypress);
      process.removeListener('SIGINT', onSigInt);
      try { stdin.setRawMode(wasRaw); } catch {}
      stdout.write('\u001b[?25h');
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      clearRender();
      cleanup();
      const labels = selectable
        .filter(choice => selectedValues.has(choice.value))
        .map(choice => choiceLabel(choice));
      const summary = labels.length > 0 ? labels.join(', ') : 'none';
      stdout.write(`? ${message} ${chalk.hex('#74d7ff')(summary)}\n`);
      resolve([...selectedValues]);
    };

    const cancel = () => {
      if (finished) return;
      finished = true;
      clearRender();
      cleanup();
      stdout.write(`? ${message} ${chalk.hex('#899691')('cancelled')}\n`);
      reject(new PromptCancelledError());
    };

    const onSigInt = () => cancel();

    const onKeypress = (str: string | undefined, key: {
      name?: string;
      sequence?: string;
      ctrl?: boolean;
      shift?: boolean;
    }) => {
      const input = str ?? '';
      if (key?.ctrl && key.name === 'c') {
        cancel();
        return;
      }

      if (key?.name === 'return' || key?.name === 'enter' || input === '\r' || input === '\n') {
        finish();
        return;
      }

      if (key?.name === 'escape' || key?.sequence === '\u001b' || input === '\u001b' || input === 'q' || input === 'Q' || input === '0') {
        cancel();
        return;
      }

      if (key?.name === 'space' || input === ' ') {
        toggle();
        return;
      }

      if (input === 'a' || input === 'A') {
        for (const choice of selectable) selectedValues.add(choice.value);
        render();
        return;
      }

      if (input === 'n' || input === 'N') {
        selectedValues.clear();
        render();
        return;
      }

      if (key?.name === 'up' || input === 'k' || input === 'K') {
        move(-1);
        return;
      }

      if (key?.name === 'down' || key?.name === 'tab' || input === 'j' || input === 'J') {
        move(1);
        return;
      }

      if (key?.name === 'pageup') {
        move(-maxRows);
        return;
      }

      if (key?.name === 'pagedown') {
        move(maxRows);
        return;
      }

      if (key?.name === 'home') {
        jumpTo(0);
        return;
      }

      if (key?.name === 'end') {
        jumpTo(selectable.length - 1);
        return;
      }

      if (/^[1-9]$/.test(input)) {
        const quickIndex = Number.parseInt(input, 10) - 1;
        if (quickIndex >= 0 && quickIndex < selectable.length) {
          jumpTo(quickIndex);
          toggle(quickIndex);
        }
      }
    };

    enableKeypressEvents();
    try { stdin.setRawMode(true); } catch {}
    stdin.resume();
    stdout.write('\u001b[?25l');
    process.once('SIGINT', onSigInt);
    stdin.on('keypress', onKeypress);
    render();
  });
}

async function readHiddenLine(question: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return readLine(question);
  }

  detachLineReader();

  return await new Promise<string>((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = Boolean((stdin as any).isRaw);
    let value = '';

    const cleanup = () => {
      stdin.removeListener('data', onData);
      try { stdin.setRawMode(wasRaw); } catch {}
      stdout.write('\n');
    };

    const finish = () => {
      cleanup();
      resolve(value);
    };

    const fail = (error: Error) => {
      cleanup();
      reject(error);
    };

    const onData = (chunk: Buffer | string) => {
      const text = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
      for (const char of text) {
        if (char === '\u0003') {
          fail(new PromptCancelledError());
          return;
        }
        if (char === '\r' || char === '\n') {
          finish();
          return;
        }
        if (char === '\u0008' || char === '\u007f') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write('\b \b');
          }
          continue;
        }
        if (char >= ' ') {
          value += char;
          stdout.write('*');
        }
      }
    };

    try { stdin.setRawMode(true); } catch {}
    stdin.resume();
    stdout.write(question);
    stdin.on('data', onData);
  });
}

export async function promptInput(options: {
  message: string;
  defaultValue?: string;
  validate?: (value: string) => true | string;
  password?: boolean;
}): Promise<string> {
  if (!useSimplePrompts()) {
    const { value } = await inquirer.prompt([
      {
        type: options.password ? 'password' : 'input',
        name: 'value',
        message: options.message,
        default: options.defaultValue,
        mask: options.password ? true : undefined,
        validate: options.validate,
      },
    ]);
    return value;
  }

  while (true) {
    const suffix = options.defaultValue ? ` [default: ${options.defaultValue}]` : '';
    const raw = options.password
      ? await readHiddenLine(`? ${options.message}${suffix}: `)
      : await readLine(`? ${options.message}${suffix}: `);
    const value = raw.trim() || options.defaultValue || '';
    const verdict = options.validate ? options.validate(value) : true;
    if (verdict === true) return value;
    process.stdout.write(`  ${verdict}\n`);
  }
}

export async function promptConfirm(options: {
  message: string;
  defaultValue?: boolean;
}): Promise<boolean> {
  if (!useSimplePrompts()) {
    const { value } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'value',
        message: options.message,
        default: options.defaultValue ?? true,
      },
    ]);
    return value;
  }

  const defaultYes = options.defaultValue ?? true;
  while (true) {
    const label = defaultYes ? 'Y/n' : 'y/N';
    const answer = (await readLine(`? ${options.message} [${label}]: `)).trim().toLowerCase();
    if (isCancelAnswer(answer)) {
      throw new PromptCancelledError();
    }
    if (!answer) return defaultYes;
    if (['y', 'yes'].includes(answer)) return true;
    if (['n', 'no'].includes(answer)) return false;
    process.stdout.write('  Enter yes or no.\n');
  }
}

export async function promptSelect<T>(options: {
  message: string;
  choices: SimpleChoice<T>[];
}): Promise<T> {
  if (!useSimplePrompts()) {
    const normalizedChoices = options.choices.map(choice => {
      if ('separator' in choice) {
        return new inquirer.Separator(choice.separator);
      }
      return {
        name: choice.name,
        value: choice.value,
        short: choice.short,
      };
    });
    const { value } = await inquirer.prompt([
      {
        type: 'list',
        name: 'value',
        message: options.message,
        choices: normalizedChoices,
        pageSize: 12,
      },
    ]);
    return value;
  }

  if (canUseKeyboardSelect()) {
    return readKeySelect(options.message, options.choices);
  }

  while (true) {
    process.stdout.write(`? ${options.message}\n`);
    const flattened = printChoices(options.choices);
    const answer = await readLine('Enter a number, or 0 to cancel: ');
    if (isCancelAnswer(answer)) {
      throw new PromptCancelledError();
    }
    const index = Number.parseInt(answer.trim(), 10);
    if (Number.isInteger(index) && index >= 1 && index <= flattened.length) {
      return flattened[index - 1].value;
    }
    process.stdout.write('  Enter one of the listed numbers.\n');
  }
}

export async function promptMultiSelect(options: {
  message: string;
  choices: SimpleChoice<string>[];
}): Promise<string[]> {
  if (!useSimplePrompts()) {
    const normalizedChoices = options.choices.map(choice => {
      if ('separator' in choice) {
        return new inquirer.Separator(choice.separator);
      }
      return {
        name: choice.name,
        value: choice.value,
      };
    });
    const { value } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'value',
        message: options.message,
        choices: normalizedChoices,
        pageSize: 20,
        loop: false,
      },
    ]);
    return value;
  }

  if (canUseKeyboardSelect()) {
    return readKeyMultiSelect(options.message, options.choices);
  }

  while (true) {
    process.stdout.write(`? ${options.message}\n`);
    const flattened = printChoices(options.choices);
    process.stdout.write('Enter comma-separated numbers, press Enter for none, or 0 to cancel.\n');
    const answer = await readLine('Selection: ');
    const trimmed = answer.trim().toLowerCase();
    if (!answer) return [];
    if (isCancelAnswer(answer)) {
      throw new PromptCancelledError();
    }

    const indexes = trimmed.split(',').map(part => Number.parseInt(part.trim(), 10));
    if (indexes.every(index => Number.isInteger(index) && index >= 1 && index <= flattened.length)) {
      return [...new Set(indexes)].map(index => flattened[index - 1].value);
    }

    process.stdout.write('  Enter numbers like 1,3,5.\n');
  }
}

export async function promptLongText(options: {
  message: string;
  validate?: (value: string) => true | string;
}): Promise<string> {
  if (!useSimplePrompts()) {
    const { value } = await inquirer.prompt([
      {
        type: 'editor',
        name: 'value',
        message: options.message,
        validate: options.validate,
      },
    ]);
    return value;
  }

  process.stdout.write(`? ${options.message}\n`);
  process.stdout.write('Enter text. Submit an empty line to finish.\n');

  while (true) {
    const lines: string[] = [];
    while (true) {
      const line = await readLine('');
      if (!line.trim()) break;
      lines.push(line);
    }
    const value = lines.join('\n').trim();
    const verdict = options.validate ? options.validate(value) : true;
    if (verdict === true) return value;
    process.stdout.write(`  ${verdict}\n`);
  }
}
