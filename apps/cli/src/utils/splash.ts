import { theme } from '../ui/theme';
import { CODETHON_VERSION } from './version';

const QUOTES: { text: string; author: string }[] = [
  { text: '"Code is poetry written in logic."', author: '— Unknown' },
  { text: '"Build things that matter."', author: '— Grace Hopper' },
  { text: '"The best error message is the one you never see."', author: '— Unknown' },
  { text: '"First, make it work. Then make it fast."', author: '— Kent Beck' },
  { text: '"Done is better than perfect."', author: '— Sheryl Sandberg' },
  { text: '"The only way to learn is by building."', author: '— Unknown' },
  { text: '"Every expert was once a beginner."', author: '— Unknown' },
  { text: '"Simplicity is the ultimate sophistication."', author: '— Leonardo da Vinci' },
  { text: '"The best time to start was yesterday. The next best time is now."', author: '— Unknown' },
  { text: '"Push yourself because no one else is going to do it for you."', author: '— Unknown' },
  { text: '"It works on my machine — now let\'s make it work everywhere."', author: '— Unknown' },
];

export function randomQuote(): { text: string; author: string } {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

export function showSplash(): string {
  const { text, author } = randomQuote();
  const logo = [
    '  ██████  ██████  ██████  ███████ ████████ ██   ██  ██████  ███    ██',
    ' ██      ██    ██ ██   ██ ██         ██    ██   ██ ██    ██ ████   ██',
    ' ██      ██    ██ ██   ██ █████      ██    ███████ ██    ██ ██ ██  ██',
    ' ██      ██    ██ ██   ██ ██         ██    ██   ██ ██    ██ ██  ██ ██',
    '  ██████  ██████  ██████  ███████    ██    ██   ██  ██████  ██   ████',
    '                                 CLI',
  ];
  const lines: string[] = [];
  lines.push('');
  lines.push(`${theme.rgb(theme.colors.primary)}${logo[0]}${theme.reset()}`);
  lines.push(`${theme.rgb(theme.colors.primary)}${logo[1]}${theme.reset()}`);
  lines.push(`${theme.rgb(theme.colors.primary)}${logo[2]}${theme.reset()}`);
  lines.push(`${theme.rgb(theme.colors.primary)}${logo[3]}${theme.reset()}`);
  lines.push(`${theme.rgb(theme.colors.secondary)}${logo[4]}${theme.reset()}`);
  lines.push(`  ${theme.bold()}${theme.rgb(theme.colors.accent)}${logo[5]}${theme.reset()}  ${theme.dim()}v${CODETHON_VERSION}${theme.reset()}`);
  lines.push(`  ${theme.dim()}AI-native execution orchestration for planning, building, debugging, and shipping.${theme.reset()}`);
  lines.push('');
  lines.push(`  ${theme.style(text, 'warning')}`);
  lines.push(`  ${theme.style(author, 'textDim')}`);
  lines.push('');
  lines.push(`  ${theme.rgb(theme.colors.primary)}${'\u2500'.repeat(86)}${theme.reset()}`);
  lines.push('');
  return lines.join('\n');
}

export function showMiniSplash(): string {
  const { text, author } = randomQuote();
  const lines: string[] = [];
  lines.push('');
  lines.push(`  ${theme.bold()}${theme.rgb(theme.colors.primary)}CODETHON CLI${theme.reset()}  ${theme.dim()}v${CODETHON_VERSION}${theme.reset()}`);
  lines.push(`  ${theme.dim()}AI-native execution orchestration${theme.reset()}`);
  lines.push('');
  lines.push(`  ${theme.style(text, 'warning')}`);
  lines.push(`  ${theme.style(author, 'textDim')}`);
  lines.push('');
  return lines.join('\n');
}
