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

const DARK_THEME: ThemeColors = {
  primary: { r: 0, g: 180, b: 255 },
  secondary: { r: 140, g: 80, b: 255 },
  success: { r: 0, g: 200, b: 120 },
  warning: { r: 255, g: 180, b: 0 },
  error: { r: 255, g: 60, b: 60 },
  info: { r: 100, g: 180, b: 255 },
  text: { r: 220, g: 220, b: 220 },
  textDim: { r: 140, g: 140, b: 140 },
  textBright: { r: 255, g: 255, b: 255 },
  background: { r: 18, g: 18, b: 22 },
  border: { r: 60, g: 60, b: 70 },
  accent: { r: 255, g: 100, b: 200 },
};

const LIGHT_THEME: ThemeColors = {
  primary: { r: 0, g: 100, b: 200 },
  secondary: { r: 100, g: 50, b: 200 },
  success: { r: 0, g: 150, b: 80 },
  warning: { r: 200, g: 140, b: 0 },
  error: { r: 200, g: 40, b: 40 },
  info: { r: 50, g: 130, b: 200 },
  text: { r: 30, g: 30, b: 35 },
  textDim: { r: 120, g: 120, b: 125 },
  textBright: { r: 0, g: 0, b: 0 },
  background: { r: 248, g: 248, b: 250 },
  border: { r: 200, g: 200, b: 205 },
  accent: { r: 200, g: 50, b: 150 },
};

export class Theme {
  private current: ThemeColors;
  private mode: 'dark' | 'light';

  constructor(mode: 'dark' | 'light' = 'dark') {
    this.mode = mode;
    this.current = mode === 'dark' ? { ...DARK_THEME } : { ...LIGHT_THEME };
  }

  get colors(): ThemeColors {
    return this.current;
  }

  isDark(): boolean {
    return this.mode === 'dark';
  }

  setMode(mode: 'dark' | 'light'): void {
    this.mode = mode;
    this.current = mode === 'dark' ? { ...DARK_THEME } : { ...LIGHT_THEME };
  }

  toggle(): void {
    this.setMode(this.mode === 'dark' ? 'light' : 'dark');
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
