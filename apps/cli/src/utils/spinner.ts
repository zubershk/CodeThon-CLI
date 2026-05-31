import ora from 'ora';
import chalk from 'chalk';

export function createSpinner(text: string) {
  const spinner = ora({
    text: `${chalk.hex('#74d7ff')('\u25C6')}  ${text}`,
    color: 'cyan',
    spinner: {
      interval: 80,
      frames: ['\u25F0', '\u25F1', '\u25F2', '\u25F3'],
    },
  });

  return {
    start: () => {
      spinner.start();
      return spinner;
    },
    succeed: (msg?: string) => {
      spinner.succeed(chalk.hex('#82f7a6')(`${msg || text}`));
    },
    fail: (msg?: string) => {
      spinner.fail(chalk.hex('#ff5c7a')(`${msg || text}`));
    },
    info: (msg: string) => {
      spinner.info(chalk.hex('#74d7ff')(msg));
    },
    update: (msg: string) => {
      spinner.text = `${chalk.hex('#74d7ff')('\u25C6')}  ${msg}`;
    },
    stop: () => {
      spinner.stop();
    },
  };
}
