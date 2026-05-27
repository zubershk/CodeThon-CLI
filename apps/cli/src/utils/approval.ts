import chalk from 'chalk';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

export interface ApprovalRequest {
  type: 'command' | 'write_file' | 'modify_file';
  description: string;
  details: string;
  risk: 'low' | 'medium' | 'high';
}

export async function requireApproval(request: ApprovalRequest): Promise<boolean> {
  const border = chalk.bold.yellowBright('\u2500'.repeat(54));

  console.log(`\n  ${border}`);
  console.log(`  ${chalk.bold.yellowBright('\u26A0')}  ${chalk.bold.whiteBright('APPROVAL REQUIRED')}`);
  console.log(`  ${border}`);

  const riskColor = request.risk === 'high' ? chalk.bgRed.white.bold :
                    request.risk === 'medium' ? chalk.bgYellow.black.bold :
                    chalk.bgGreen.black.bold;

  console.log(`  ${chalk.dim('\u2502')}  ${chalk.bold.whiteBright('Action:')} ${chalk.whiteBright(request.description)}`);
  console.log(`  ${chalk.dim('\u2502')}  ${chalk.bold.whiteBright('Risk:')}   ${riskColor(` ${request.risk.toUpperCase()} `)}`);
  console.log(`  ${chalk.dim('\u2502')}`);
  console.log(`  ${chalk.dim('\u2502')}  ${request.details.replace(/\n/g, '\n  ' + chalk.dim('\u2502') + '  ')}`);
  console.log(`  ${border}`);

  return askYesNo('  Proceed?');
}

export async function askYesNo(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${prompt} ${chalk.dim('(y/N)')} `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export async function showDiffAndApprove(filePath: string, newContent: string): Promise<boolean> {
  if (!fs.existsSync(filePath)) {
    return requireApproval({
      type: 'write_file',
      description: `Create new file: ${path.basename(filePath)}`,
      details: `Path: ${filePath}\nSize: ~${(newContent.length / 1024).toFixed(1)}KB`,
      risk: 'low',
    });
  }

  const oldContent = fs.readFileSync(filePath, 'utf-8');
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const diffLines: string[] = [];
  const maxDiff = 30;
  let changes = 0;

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (oldLines[i] !== newLines[i]) {
      if (diffLines.length < maxDiff) {
        if (oldLines[i] !== undefined) {
          diffLines.push(`  ${chalk.redBright('- ' + oldLines[i])}`);
        }
        if (newLines[i] !== undefined) {
          diffLines.push(`  ${chalk.greenBright('+ ' + newLines[i])}`);
        }
      }
      changes++;
    }
  }

  const summary = `File: ${filePath}\nChanges: ${changes} line${changes !== 1 ? 's' : ''}`;
  const diff = diffLines.length > 0
    ? `Changes:\n${diffLines.join('\n')}${changes > maxDiff ? `\n... and ${changes - maxDiff} more changes` : ''}`
    : 'Content changed (structure differs)';

  return requireApproval({
    type: 'modify_file',
    description: `Modify: ${path.basename(filePath)}`,
    details: `${summary}\n${diff}`,
    risk: changes > 10 ? 'high' : changes > 3 ? 'medium' : 'low',
  });
}
