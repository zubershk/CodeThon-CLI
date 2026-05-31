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
  const border = chalk.hex('#ffcf5c').bold('\u2500'.repeat(54));

  console.log(`\n  ${border}`);
  console.log(`  ${chalk.hex('#ffcf5c').bold('\u26A0')}  ${chalk.hex('#f7fff9').bold('APPROVAL REQUIRED')}`);
  console.log(`  ${border}`);

  const riskColor = request.risk === 'high' ? chalk.bgHex('#ff5c7a').hex('#fff7fa').bold :
                    request.risk === 'medium' ? chalk.bgHex('#ffcf5c').hex('#100b00').bold :
                    chalk.bgHex('#82f7a6').hex('#00110b').bold;

  console.log(`  ${chalk.hex('#899691')('\u2502')}  ${chalk.hex('#f7fff9').bold('Action:')} ${chalk.hex('#f7fff9')(request.description)}`);
  console.log(`  ${chalk.hex('#899691')('\u2502')}  ${chalk.hex('#f7fff9').bold('Risk:')}   ${riskColor(` ${request.risk.toUpperCase()} `)}`);
  console.log(`  ${chalk.hex('#899691')('\u2502')}`);
  console.log(`  ${chalk.hex('#899691')('\u2502')}  ${request.details.replace(/\n/g, '\n  ' + chalk.hex('#899691')('\u2502') + '  ')}`);
  console.log(`  ${border}`);

  return askYesNo('  Proceed?');
}

export async function askYesNo(prompt: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${prompt} ${chalk.hex('#899691')('(y/N)')} `, (answer) => {
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
          diffLines.push(`  ${chalk.hex('#ff5c7a')('- ' + oldLines[i])}`);
        }
        if (newLines[i] !== undefined) {
          diffLines.push(`  ${chalk.hex('#82f7a6')('+ ' + newLines[i])}`);
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
