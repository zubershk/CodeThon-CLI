import { theme } from './theme';

export class Animations {
  private intervals: ReturnType<typeof setInterval>[] = [];

  thinking(duration = 3000): () => string | null {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    const dots = ['   ', '.  ', '.. ', '...'];
    let frameIndex = 0;
    let dotIndex = 0;
    const startTime = Date.now();
    const primary = theme.colors.primary;
    const secondary = theme.colors.secondary;

    return () => {
      if (Date.now() - startTime > duration) return null;

      const spinner = frames[frameIndex % frames.length];
      const dotsStr = dots[dotIndex % dots.length];
      frameIndex++;
      dotIndex++;

      const t = (Date.now() - startTime) / duration;
      const r = Math.round(primary.r + (secondary.r - primary.r) * t);
      const g = Math.round(primary.g + (secondary.g - primary.g) * t);
      const b = Math.round(primary.b + (secondary.b - primary.b) * t);

      return `\x1b[38;2;${r};${g};${b}m${spinner}\x1b[0m thinking${dotsStr}`;
    };
  }

  filePulse(filename: string, duration = 800): () => string | null {
    const startTime = Date.now();
    const success = theme.colors.success;

    return () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) return null;

      const t = elapsed / duration;
      const brightness = Math.sin(t * Math.PI);
      const r = Math.round(success.r * brightness);
      const g = Math.round(success.g * brightness);
      const b = Math.round(success.b * brightness);

      return `\x1b[38;2;${r};${g};${b}m\u2728\x1b[0m ${filename}`;
    };
  }

  executionWave(progress: number): string {
    const width = 30;
    const position = Math.round(progress * width);
    const bar: string[] = [];

    for (let i = 0; i < width; i++) {
      if (i < position) {
        const t = i / width;
        const r = Math.round(0 + (0 - 0) * t);
        const g = Math.round(200 + (180 - 200) * t);
        const b = Math.round(80 + (0 - 80) * t);
        bar.push(`\x1b[38;2;${r};${g};${b}m\u2588\x1b[0m`);
      } else if (i === position) {
        bar.push(`\x1b[38;2;100;180;255m\u2592\x1b[0m`);
      } else {
        bar.push(`\x1b[38;2;60;60;70m\u2591\x1b[0m`);
      }
    }

    return `[${bar.join('')}] ${Math.round(progress * 100)}%`;
  }

  successExplosion(): string {
    const chars = ['\u2728', '\u2728', '\u2B50', '\u2606', '\u2605'];
    let output = '';
    for (let i = 0; i < 8; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      const color = Math.floor(Math.random() * 256);
      output += `\x1b[38;2;${color};${Math.min(255, color + 50)};${Math.max(0, color - 50)}m${char}\x1b[0m `;
    }
    return output;
  }

  errorShake(text: string, intensity = 3): string {
    const offset = Math.random() > 0.5 ? ' '.repeat(intensity) : '';
    const error = theme.colors.error;
    return `${offset}\x1b[38;2;${error.r};${error.g};${error.b}m${text}\x1b[0m`;
  }

  stopAll(): void {
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
  }
}

export const animations = new Animations();
