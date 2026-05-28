import chalk from 'chalk';

const ACCENT = '#7C3AED';
const GOLD = '#F59E0B';

const QUOTES = [
  '"Code is poetry written in logic."',
  '"Build things that matter."',
  '"The best error message is the one you never see."',
  '"First, make it work. Then make it fast."',
  '"A ship in harbor is safe, but that is not what ships are for."',
  '"Done is better than perfect."',
  '"The only way to learn is by building."',
  '"Every expert was once a beginner."',
  '"Code never lies, comments sometimes do."',
  '"Simplicity is the ultimate sophistication."',
  '"It works on my machine — now let\'s make it work everywhere."',
  '"The best time to start was yesterday. The next best time is now."',
  '"Push yourself because no one else is going to do it for you."',
  '"Your most unhappy customers are your greatest source of learning."',
  '"The computer was born to solve problems that did not exist before."',
];

const AUTHORS = [
  '— Leonardo da Vinci', '— Grace Hopper', '— Socrates',
  '— Steve Jobs', '— Ron Jeffries', '— Albert Einstein',
  '— Leonardo da Vinci', '— Unknown', '— Ron Jeffries',
  '— Leonardo da Vinci', '— Unknown', '— Unknown',
  '— Unknown', '— Bill Gates', '— Bill Gates',
];

export function randomQuote(): { text: string; author: string } {
  const i = Math.floor(Math.random() * QUOTES.length);
  return { text: QUOTES[i], author: AUTHORS[i] };
}

export function showSplash(): string {
  const { text, author } = randomQuote();

  return [
    '',
    `  ${chalk.hex(ACCENT)('\u2554' + '\u2550'.repeat(48) + '\u2557')}`,
    `  ${chalk.hex(ACCENT)('\u2551')}  ${chalk.bold.hex('#A78BFA')('CodeThon CLI')}${' '.repeat(34)}${chalk.hex(ACCENT)('\u2551')}`,
    `  ${chalk.hex(ACCENT)('\u2551')}  ${chalk.dim('ai-native execution orchestration')}${' '.repeat(12)}${chalk.hex(ACCENT)('\u2551')}`,
    `  ${chalk.hex(ACCENT)('\u255A' + '\u2550'.repeat(48) + '\u255D')}`,
    '',
    `  ${chalk.hex(GOLD)(text)}`,
    `  ${chalk.dim(author)}`,
    '',
    `  ${chalk.hex(ACCENT)('\u2500'.repeat(52))}`,
    '',
  ].join('\n');
}

export function showMiniSplash(): string {
  const { text, author } = randomQuote();

  return [
    '',
    `  ${chalk.hex(ACCENT)('\u250C' + '\u2500'.repeat(48) + '\u2510')}`,
    `  ${chalk.hex(ACCENT)('\u2502')}  ${chalk.bold.hex('#A78BFA')('CodeThon CLI')}${' '.repeat(36)}${chalk.hex(ACCENT)('\u2502')}`,
    `  ${chalk.hex(ACCENT)('\u2514' + '\u2500'.repeat(48) + '\u2518')}`,
    '',
    `  ${chalk.hex(GOLD)(text)}`,
    `  ${chalk.dim(author)}`,
    '',
  ].join('\n');
}
