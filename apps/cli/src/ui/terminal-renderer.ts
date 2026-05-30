import { theme, type RGB } from './theme';

interface Cell {
  char: string;
  fg?: RGB;
  bg?: RGB;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface BoxDrawOptions {
  width: number;
  height: number;
  title?: string;
  color?: keyof typeof theme.colors;
  borderStyle?: 'rounded' | 'straight' | 'double';
  fill?: boolean;
  fillColor?: keyof typeof theme.colors;
}

export class TerminalRenderer {
  private width: number;
  private height: number;
  private buffer: Cell[][];
  private prevBuffer: Cell[][];
  private cursorX = 0;
  private cursorY = 0;
  private supportsRGB: boolean;
  private resizeHandler: () => void;
  private alternateScreen = false;
  private cursorHidden = false;
  private disposed = false;

  constructor() {
    this.width = process.stdout.columns || 80;
    this.height = process.stdout.rows || 24;
    this.buffer = this.createBuffer();
    this.prevBuffer = this.createBuffer();
    this.supportsRGB = this.detectRGB();

    this.resizeHandler = () => {
      this.width = process.stdout.columns || 80;
      this.height = process.stdout.rows || 24;
      this.buffer = this.createBuffer();
      this.prevBuffer = this.createBuffer();
      this.cursorX = 0;
      this.cursorY = 0;
    };

    process.stdout.on('resize', this.resizeHandler);
  }

  private sanitizeText(text: string): string {
    return text
      .replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '')
      .replace(/\r/g, '');
  }

  private resetBuffers(): void {
    this.buffer = this.createBuffer();
    this.prevBuffer = this.createBuffer();
    this.cursorX = 0;
    this.cursorY = 0;
  }

  enterAlternateScreen(): void {
    if (!process.stdout.isTTY || this.alternateScreen) return;
    process.stdout.write('\x1b[?1049h\x1b[H\x1b[2J');
    this.alternateScreen = true;
    this.resetBuffers();
  }

  leaveAlternateScreen(): void {
    if (!process.stdout.isTTY || !this.alternateScreen) return;
    process.stdout.write('\x1b[0m\x1b[2J\x1b[H\x1b[?1049l');
    this.alternateScreen = false;
    this.resetBuffers();
  }

  hideCursor(): void {
    if (!process.stdout.isTTY || this.cursorHidden) return;
    process.stdout.write('\x1b[?25l');
    this.cursorHidden = true;
  }

  showCursor(): void {
    if (!process.stdout.isTTY || !this.cursorHidden) return;
    process.stdout.write('\x1b[?25h');
    this.cursorHidden = false;
  }

  dispose(options: { restoreScreen?: boolean } = {}): void {
    if (this.disposed) return;
    this.disposed = true;
    process.stdout.off('resize', this.resizeHandler);
    this.showCursor();
    if (options.restoreScreen) {
      this.leaveAlternateScreen();
    } else {
      process.stdout.write('\x1b[0m');
    }
  }

  private createBuffer(): Cell[][] {
    return Array.from({ length: this.height }, () =>
      Array.from({ length: this.width }, () => ({ char: ' ' }))
    );
  }

  clearRegion(x: number, y: number, width: number, height: number): void {
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        this.setPixel(col, row, ' ');
      }
    }
  }

  fillRect(x: number, y: number, width: number, height: number, style?: Partial<Omit<Cell, 'char'>>): void {
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        this.setPixel(col, row, ' ', style);
      }
    }
  }

  private detectRGB(): boolean {
    const term = process.env.TERM || '';
    const colorterm = process.env.COLORTERM || '';
    return colorterm === 'truecolor' || colorterm === '24bit' || term.includes('256color') || term.includes('truecolor');
  }

  setPixel(x: number, y: number, char: string, style?: Partial<Omit<Cell, 'char'>>): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    this.buffer[y][x] = { char: char[0] || ' ', ...style };
  }

  writeText(x: number, y: number, text: string, style?: Partial<Omit<Cell, 'char'>>): void {
    const sanitized = this.sanitizeText(text);
    let currentX = x;
    let currentY = y;

    for (const char of sanitized) {
      if (char === '\n') {
        currentX = x;
        currentY++;
        if (currentY >= this.height) break;
        continue;
      }

      this.setPixel(currentX, currentY, char, style);
      currentX++;
      if (currentX >= this.width) break;
    }
  }

  drawBox(x: number, y: number, options: BoxDrawOptions): void {
    const {
      width,
      height,
      title,
      color = 'border',
      borderStyle = 'rounded',
      fill = false,
      fillColor,
    } = options;

    if (width < 2 || height < 2) return;
    if (x >= this.width || y >= this.height) return;

    const clippedWidth = Math.min(width, this.width - x);
    const clippedHeight = Math.min(height, this.height - y);
    if (clippedWidth < 2 || clippedHeight < 2) return;

    const colors = theme.colors;
    const borderColor = colors[color];

    const [tl, tr, bl, br, h, v] = borderStyle === 'rounded'
      ? ['╭', '╮', '╰', '╯', '─', '│']
      : borderStyle === 'double'
        ? ['╔', '╗', '╚', '╝', '═', '║']
        : ['┌', '┐', '└', '┘', '─', '│'];

    // corners
    this.setPixel(x, y, tl, { fg: borderColor });
    this.setPixel(x + clippedWidth - 1, y, tr, { fg: borderColor });
    this.setPixel(x, y + clippedHeight - 1, bl, { fg: borderColor });
    this.setPixel(x + clippedWidth - 1, y + clippedHeight - 1, br, { fg: borderColor });

    // edges
    for (let i = 1; i < clippedWidth - 1; i++) {
      this.setPixel(x + i, y, h, { fg: borderColor });
      this.setPixel(x + i, y + clippedHeight - 1, h, { fg: borderColor });
    }
    for (let i = 1; i < clippedHeight - 1; i++) {
      this.setPixel(x, y + i, v, { fg: borderColor });
      this.setPixel(x + clippedWidth - 1, y + i, v, { fg: borderColor });
    }

    // title
    if (title) {
      const displayTitle = ` ${this.sanitizeText(title)} `.slice(0, Math.max(0, clippedWidth - 4));
      const titleStart = x + 2;
      for (let i = 0; i < displayTitle.length && titleStart + i < x + clippedWidth - 1; i++) {
        this.setPixel(titleStart + i, y, displayTitle[i], { fg: borderColor, bold: true });
      }
    }

    // fill
    if (fill && fillColor) {
      const fillRGB = colors[fillColor];
      for (let fy = y + 1; fy < y + clippedHeight - 1; fy++) {
        for (let fx = x + 1; fx < x + clippedWidth - 1; fx++) {
          const existing = this.buffer[fy]?.[fx];
          if (existing && existing.char !== ' ' && existing.char !== h && existing.char !== v) continue;
          this.setPixel(fx, fy, ' ', { bg: fillRGB });
        }
      }
    }
  }

  clear(): void {
    this.buffer = this.createBuffer();
  }

  clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[H');
    this.resetBuffers();
  }

  flush(): void {
    const output: string[] = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.buffer[y][x];
        const prev = this.prevBuffer[y][x];

        if (this.cellEqual(cell, prev)) continue;

        if (x !== this.cursorX || y !== this.cursorY) {
          output.push(`\x1b[${y + 1};${x + 1}H`);
          this.cursorX = x;
          this.cursorY = y;
        }

        output.push(this.cellToAnsi(cell));
        this.cursorX++;
      }
    }

    if (output.length > 0) {
      process.stdout.write(output.join(''));
    }

    this.prevBuffer = this.buffer.map(row => row.map(cell => ({ ...cell })));
  }

  private cellEqual(a: Cell, b: Cell): boolean {
    return a.char === b.char
      && a.bold === b.bold
      && a.dim === b.dim
      && a.italic === b.italic
      && a.underline === b.underline
      && this.rgbEqual(a.fg, b.fg)
      && this.rgbEqual(a.bg, b.bg);
  }

  private rgbEqual(a?: RGB, b?: RGB): boolean {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.r === b.r && a.g === b.g && a.b === b.b;
  }

  private cellToAnsi(cell: Cell): string {
    const codes: string[] = [];
    const { char, fg, bg, bold, dim, italic, underline } = cell;

    if (bold) codes.push('1');
    if (dim) codes.push('2');
    if (italic) codes.push('3');
    if (underline) codes.push('4');

    if (this.supportsRGB) {
      if (fg) codes.push(`38;2;${fg.r};${fg.g};${fg.b}`);
      if (bg) codes.push(`48;2;${bg.r};${bg.g};${bg.b}`);
    } else {
      if (fg) codes.push('37');
      if (bg) codes.push('40');
    }

    return codes.length > 0 ? `\x1b[${codes.join(';')}m${char}\x1b[0m` : char;
  }

  animate(callback: () => boolean, fps = 30): void {
    const interval = 1000 / fps;
    const animate = () => {
      const shouldContinue = callback();
      this.flush();
      if (shouldContinue) {
        setTimeout(animate, interval);
      }
    };
    animate();
  }

  get dimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }
}
