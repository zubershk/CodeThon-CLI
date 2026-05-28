import readline from 'readline';

export type KeyHandler = () => void | Promise<void>;

export class KeyBindingManager {
  private bindings = new Map<string, KeyHandler>();
  private rawMode = false;
  private originalMode: boolean | undefined;

  register(keyCombo: string, handler: KeyHandler): void {
    this.bindings.set(keyCombo, handler);
  }

  unregister(keyCombo: string): void {
    this.bindings.delete(keyCombo);
  }

  enable(): void {
    if (!process.stdin.isTTY || this.rawMode) return;
    this.originalMode = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    this.rawMode = true;

    process.stdin.on('data', this.handleData);
  }

  disable(): void {
    if (!this.rawMode) return;
    process.stdin.removeListener('data', this.handleData);
    if (this.originalMode !== undefined) {
      try { process.stdin.setRawMode(this.originalMode); } catch { /* ignore */ }
    }
    this.rawMode = false;
  }

  private handleData = (chunk: string): void => {
    const key = this.parseKeystroke(chunk);
    const handler = this.bindings.get(key);
    if (handler) {
      handler();
    }
  };

  private parseKeystroke(chunk: string): string {
    if (chunk === '\x03') return 'ctrl+c';
    if (chunk === '\x04') return 'ctrl+d';
    if (chunk === '\t') return 'tab';
    if (chunk === '\r' || chunk === '\n') return 'enter';
    if (chunk === '\x7f' || chunk === '\b') return 'backspace';
    if (chunk === '\x1b') return 'escape';
    if (chunk === '\x1b[A' || chunk === '\x1bOA') return 'up';
    if (chunk === '\x1b[B' || chunk === '\x1bOB') return 'down';
    if (chunk === '\x1b[C' || chunk === '\x1bOC') return 'right';
    if (chunk === '\x1b[D' || chunk === '\x1bOD') return 'left';
    if (chunk === '\x1b[H' || chunk === '\x1bOH') return 'home';
    if (chunk === '\x1b[F' || chunk === '\x1bOF') return 'end';
    if (chunk === '\x1b[2~') return 'insert';
    if (chunk === '\x1b[3~') return 'delete';
    if (chunk === '\x1b[5~') return 'pageup';
    if (chunk === '\x1b[6~') return 'pagedown';

    const code = chunk.charCodeAt(0);
    if (code >= 1 && code <= 26) {
      const char = String.fromCharCode(code + 96);
      return char === 'i' ? 'tab' : `ctrl+${char}`;
    }

    return chunk;
  }

  setupDefaultBindings(): void {
    this.register('ctrl+c', () => process.exit(0));
    this.register('ctrl+l', () => {
      process.stdout.write('\x1b[2J\x1b[H');
    });
    this.register('ctrl+d', () => {
      process.exit(0);
    });
  }

  lookup(keyName: string, ctrl: boolean, shift: boolean): KeyHandler | undefined {
    if (ctrl && keyName.length === 1) return this.bindings.get(`ctrl+${keyName}`);
    if (ctrl) return this.bindings.get(`ctrl+${keyName}`);
    if (shift && keyName.length === 1) return this.bindings.get(`shift+${keyName}`);
    return this.bindings.get(keyName);
  }

  getRegistered(): { combo: string; handler: KeyHandler }[] {
    return Array.from(this.bindings.entries()).map(([combo, handler]) => ({ combo, handler }));
  }

  isEnabled(): boolean {
    return this.rawMode;
  }
}
