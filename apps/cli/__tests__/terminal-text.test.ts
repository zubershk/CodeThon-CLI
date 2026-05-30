import { buildPromptLayout, stripAnsi, truncateText, wrapText } from '../src/ui/terminal-text';

describe('terminal-text', () => {
  it('strips ANSI escape sequences', () => {
    expect(stripAnsi('\x1b[31mhello\x1b[0m')).toBe('hello');
  });

  it('truncates long text with ellipsis', () => {
    expect(truncateText('abcdefgh', 5)).toBe('abcd…');
    expect(truncateText('abc', 5)).toBe('abc');
  });

  it('wraps text to the requested width', () => {
    expect(wrapText('hello world from codethon', 10)).toEqual([
      'hello',
      'world from',
      'codethon',
    ]);
  });

  it('computes prompt layout for wrapped input', () => {
    const layout = buildPromptLayout('1234567890abcd', 14, 12, 4);
    expect(layout.lines).toEqual(['12345678', '90abcd']);
    expect(layout.cursorRow).toBe(1);
    expect(layout.cursorCol).toBe(6);
  });

  it('respects explicit newlines in prompt layout', () => {
    const layout = buildPromptLayout('abc\ndef', 7, 20, 4);
    expect(layout.lines).toEqual(['abc', 'def']);
    expect(layout.cursorRow).toBe(1);
    expect(layout.cursorCol).toBe(3);
  });
});
