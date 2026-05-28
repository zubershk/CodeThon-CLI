import { theme } from '../ui/theme';
import { TerminalRenderer } from '../ui/terminal-renderer';

const QUOTES: { text: string; author: string }[] = [
  { text: '"Code is poetry written in logic."', author: '— Leonardo da Vinci' },
  { text: '"Build things that matter."', author: '— Grace Hopper' },
  { text: '"The best error message is the one you never see."', author: '— Socrates' },
  { text: '"First, make it work. Then make it fast."', author: '— Steve Jobs' },
  { text: '"A ship in harbor is safe, but that is not what ships are for."', author: '— Ron Jeffries' },
  { text: '"Done is better than perfect."', author: '— Unknown' },
  { text: '"The only way to learn is by building."', author: '— Unknown' },
  { text: '"Every expert was once a beginner."', author: '— Unknown' },
  { text: '"Code never lies, comments sometimes do."', author: '— Ron Jeffries' },
  { text: '"Simplicity is the ultimate sophistication."', author: '— Leonardo da Vinci' },
  { text: '"It works on my machine — now let\'s make it work everywhere."', author: '— Unknown' },
  { text: '"The best time to start was yesterday. The next best time is now."', author: '— Unknown' },
  { text: '"Push yourself because no one else is going to do it for you."', author: '— Unknown' },
  { text: '"Your most unhappy customers are your greatest source of learning."', author: '— Bill Gates' },
  { text: '"The computer was born to solve problems that did not exist before."', author: '— Bill Gates' },
];

export function randomQuote(): { text: string; author: string } {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export function showSplash(): string {
  const { text, author } = randomQuote();
  const r = new TerminalRenderer();

  const lines: string[] = [];
  lines.push('');
  lines.push(`  ${theme.rgb(theme.colors.primary)}\u2554${'\u2550'.repeat(48)}\u2557${theme.reset()}`);
  lines.push(`  ${theme.rgb(theme.colors.primary)}\u2551${theme.reset()}  ${theme.bold()}${theme.rgb(theme.colors.secondary)}CodeThon CLI${theme.reset()}${' '.repeat(34)}${theme.rgb(theme.colors.primary)}\u2551${theme.reset()}`);
  lines.push(`  ${theme.rgb(theme.colors.primary)}\u2551${theme.reset()}  ${theme.dim()}ai-native execution orchestration${theme.reset()}${' '.repeat(12)}${theme.rgb(theme.colors.primary)}\u2551${theme.reset()}`);
  lines.push(`  ${theme.rgb(theme.colors.primary)}\u255A${'\u2550'.repeat(48)}\u255D${theme.reset()}`);
  lines.push('');
  lines.push(`  ${theme.style(text, 'warning')}`);
  lines.push(`  ${theme.style(author, 'textDim')}`);
  lines.push('');
  lines.push(`  ${theme.rgb(theme.colors.primary)}${'\u2500'.repeat(52)}${theme.reset()}`);
  lines.push('');

  return lines.join('\n');
}

export function showMiniSplash(): string {
  const { text, author } = randomQuote();

  const lines: string[] = [];
  lines.push('');
  lines.push(`  ${theme.rgb(theme.colors.primary)}\u250C${'\u2500'.repeat(48)}\u2510${theme.reset()}`);
  lines.push(`  ${theme.rgb(theme.colors.primary)}\u2502${theme.reset()}  ${theme.bold()}${theme.rgb(theme.colors.secondary)}CodeThon CLI${theme.reset()}${' '.repeat(36)}${theme.rgb(theme.colors.primary)}\u2502${theme.reset()}`);
  lines.push(`  ${theme.rgb(theme.colors.primary)}\u2514${'\u2500'.repeat(48)}\u2518${theme.reset()}`);
  lines.push('');
  lines.push(`  ${theme.style(text, 'warning')}`);
  lines.push(`  ${theme.style(author, 'textDim')}`);
  lines.push('');

  return lines.join('\n');
}
