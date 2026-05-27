import ora from 'ora';
import chalk from 'chalk';

export function createSpinner(text: string) {
  const spinner = ora({
    text: `${chalk.cyan('\u25C6')}  ${text}`,
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
      spinner.succeed(chalk.green(`${msg || text}`));
    },
    fail: (msg?: string) => {
      spinner.fail(chalk.red(`${msg || text}`));
    },
    info: (msg: string) => {
      spinner.info(chalk.cyan(msg));
    },
    update: (msg: string) => {
      spinner.text = `${chalk.cyan('\u25C6')}  ${msg}`;
    },
    stop: () => {
      spinner.stop();
    },
  };
}
