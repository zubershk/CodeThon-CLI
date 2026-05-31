export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ThemeColors {
  primary: RGB;
  secondary: RGB;
  success: RGB;
  warning: RGB;
  error: RGB;
  info: RGB;
  text: RGB;
  textDim: RGB;
  textBright: RGB;
  background: RGB;
  border: RGB;
  accent: RGB;
}

const OLED_DARK_THEME: ThemeColors = {
  primary: { r: 116, g: 215, b: 255 },
  secondary: { r: 223, g: 255, b: 114 },
  success: { r: 130, g: 247, b: 166 },
  warning: { r: 255, g: 207, b: 92 },
  error: { r: 255, g: 92, b: 122 },
  info: { r: 116, g: 215, b: 255 },
  text: { r: 224, g: 230, b: 225 },
  textDim: { r: 137, g: 150, b: 145 },
  textBright: { r: 255, g: 255, b: 255 },
  background: { r: 0, g: 0, b: 0 },
  border: { r: 58, g: 68, b: 64 },
  accent: { r: 223, g: 255, b: 114 },
};

export class Theme {
  private current: ThemeColors;
  private mode: 'dark' | 'light';

  constructor(mode: 'dark' | 'light' = 'dark') {
    this.mode = 'dark';
    this.current = { ...OLED_DARK_THEME };
  }

  get colors(): ThemeColors {
    return this.current;
  }

  isDark(): boolean {
    return this.mode === 'dark';
  }

  setMode(mode: 'dark' | 'light'): void {
    void mode;
    this.mode = 'dark';
    this.current = { ...OLED_DARK_THEME };
  }

  toggle(): void {
    this.setMode('dark');
  }

  rgb(color: RGB): string {
    return `\x1b[38;2;${color.r};${color.g};${color.b}m`;
  }

  bgRgb(color: RGB): string {
    return `\x1b[48;2;${color.r};${color.g};${color.b}m`;
  }

  reset(): string {
    return '\x1b[0m';
  }

  bold(): string {
    return '\x1b[1m';
  }

  dim(): string {
    return '\x1b[2m';
  }

  italic(): string {
    return '\x1b[3m';
  }

  underline(): string {
    return '\x1b[4m';
  }

  style(text: string, color: keyof ThemeColors, ...modifiers: Array<'bold' | 'dim' | 'italic' | 'underline'>): string {
    const colorCode = this.rgb(this.current[color]);
    const modCodes = modifiers.map(m => this[m]()).join('');
    return `${colorCode}${modCodes}${text}${this.reset()}`;
  }

  gradient(text: string, startColor: RGB, endColor: RGB): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const t = text.length > 1 ? i / (text.length - 1) : 0;
      const r = Math.round(startColor.r + (endColor.r - startColor.r) * t);
      const g = Math.round(startColor.g + (endColor.g - startColor.g) * t);
      const b = Math.round(startColor.b + (endColor.b - startColor.b) * t);
      result += `\x1b[38;2;${r};${g};${b}m${text[i]}\x1b[0m`;
    }
    return result;
  }
}

export const theme = new Theme(typeof process !== 'undefined' ? (process as any).env?.CODETHON_THEME || 'dark' : 'dark');
