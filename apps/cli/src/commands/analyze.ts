import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import type { CommandResult } from '@codethon/shared-types';
import { BuildEngine } from '../cil/build-engine';
import { StateManager } from '../cil/state-manager';
import { logger } from '../utils';
import { createMarkdownStreamRenderer, type MarkdownStreamRenderer } from '../utils/render';

function countNodes(nodes: Array<{ children?: any[] }>): number {
  let count = 0;
  for (const node of nodes) {
    count++;
    if (node.children) count += countNodes(node.children);
  }
  return count;
}

function printRunFacts(rows: Array<{ label: string; value: string }>): void {
  const width = Math.max(60, Math.min(110, (process.stdout.columns || 88) - 4));
  const inner = width - 4;
  console.log(`  ${chalk.hex('#74d7ff')('┌')}${chalk.hex('#74d7ff')('─'.repeat(width - 2))}${chalk.hex('#74d7ff')('┐')}`);
  console.log(`  ${chalk.hex('#74d7ff')('│')} ${chalk.hex('#f7fff9').bold('Analysis run'.padEnd(inner))} ${chalk.hex('#74d7ff')('│')}`);
  console.log(`  ${chalk.hex('#74d7ff')('├')}${chalk.hex('#74d7ff')('─'.repeat(width - 2))}${chalk.hex('#74d7ff')('┤')}`);
  for (const row of rows) {
    const label = `${row.label}:`.padEnd(12);
    const value = row.value.replace(/\s+/g, ' ');
    const text = `${label} ${value}`;
    const clipped = text.length > inner ? `${text.slice(0, inner - 1)}…` : text.padEnd(inner);
    console.log(`  ${chalk.hex('#74d7ff')('│')} ${chalk.hex('#899691')(clipped)} ${chalk.hex('#74d7ff')('│')}`);
  }
  console.log(`  ${chalk.hex('#74d7ff')('└')}${chalk.hex('#74d7ff')('─'.repeat(width - 2))}${chalk.hex('#74d7ff')('┘')}`);
  console.log('');
}

export async function analyzeCommand(targetDir?: string): Promise<CommandResult> {
  const state = new StateManager();
  const project = state.getProject();

  // Auto-detect target: explicit dir > scaffolded project > cwd
  let scanDir: string;
  if (targetDir) {
    scanDir = path.resolve(targetDir);
  } else {
    const cwd = process.cwd();
    // If cwd already has project markers, stay at cwd
    const projectMarkers = [
      'package.json', 'tsconfig.json', 'Cargo.toml', 'go.mod',
      'pyproject.toml', 'requirements.txt', 'Gemfile',
      'Dockerfile', 'Makefile', '.editorconfig',
    ];
    const hasMarker = projectMarkers.some(m => fs.existsSync(path.join(cwd, m)));

    if (hasMarker) {
      scanDir = cwd;
    } else {
      // Look for scaffolded project subdirectories
      const entries = fs.readdirSync(cwd, { withFileTypes: true });
      const projectDirs = entries.filter(e =>
        e.isDirectory() &&
        !e.name.startsWith('.') &&
        ![
          'node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt',
          '__pycache__', '.venv', 'venv', '.cache', 'coverage',
          '.turbo', '.nx', '.vscode', '.idea',
          'apps', 'packages', 'libs', 'modules', 'services',
        ].includes(e.name)
      );
      // If there's exactly one non-CLI project dir, use it
      if (projectDirs.length === 1) {
        scanDir = path.join(cwd, projectDirs[0].name);
      } else {
        scanDir = cwd;
      }
    }
  }

  logger.section(`CodeThon CLI — Analysis: ${chalk.hex('#f7fff9').bold(path.basename(scanDir))}`);
  printRunFacts([
    { label: 'Target', value: scanDir },
    { label: 'Checks', value: 'file tree, key configs, stack, entry points, missing files, static issues, AI summary' },
    { label: 'Output', value: 'summary streams live; details appear after the scan' },
  ]);
  const engine = new BuildEngine(scanDir);

  try {
    const summaryStreams: MarkdownStreamRenderer[] = [];
    let summaryStreamed = false;
    const analysis = await engine.analyzeProject({
      onProgress: message => logger.info(message),
      onSummaryStart: () => {
        summaryStreams[0] = createMarkdownStreamRenderer({ title: 'AI Summary' });
      },
      onSummaryToken: token => {
        summaryStreamed = true;
        summaryStreams[0]?.write(token);
      },
    });
    summaryStreams[0]?.end();
    if (summaryStreamed) process.stdout.write('\n');

    logger.labelValue('Name', analysis.name);
    logger.labelValue('Tech Stack', analysis.techStack.join(', ') || chalk.hex('#899691')('unknown'));
    logger.labelValue('Entry Points', analysis.entryPoints.join(', ') || chalk.hex('#899691')('none'));
    logger.labelValue('Files/Folders Scanned', `${countNodes(analysis.structure)}`);
    logger.labelValue('Issues', `${analysis.issues.length}`);
    logger.labelValue('Missing Files', `${analysis.missingFiles.length}`);
    logger.divider();
    process.stdout.write('\n');

    logger.subsection('File Structure');
    function printTree(nodes: any[], prefix = ''): void {
      let i = 0;
      for (const node of nodes) {
        const isLast = i === nodes.length - 1;
        const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
        const display = path.relative(scanDir, node.path);
        if (!display.startsWith('..')) {
          console.log(`  ${chalk.hex('#899691')('\u2502')} ${prefix}${chalk.hex('#899691')(connector)}${node.isDir ? chalk.hex('#74d7ff').bold(display) + '/' : chalk.hex('#f7fff9')(display)}`);
          if (node.children) {
            printTree(node.children, prefix + (isLast ? '    ' : '\u2502   '));
          }
        }
        i++;
      }
    }
    const firstNodes = analysis.structure.slice(0, 30);
    printTree(firstNodes);
    if (analysis.structure.length > 30) {
      console.log(`  ${chalk.hex('#899691')('\u2502')}  ${chalk.hex('#899691')('... and ' + (analysis.structure.length - 30) + ' more items')}`);
    }
    process.stdout.write('\n');

    if (analysis.issues.length > 0) {
      logger.subsection('Issues Found');
      for (const issue of analysis.issues) {
        const icon = issue.severity === 'critical' ? chalk.hex('#ff5c7a')('\u2717') :
                     issue.severity === 'warning' ? chalk.hex('#ffcf5c')('\u26A0') :
                     chalk.hex('#74d7ff')('\u2139');
        const sev = issue.severity === 'critical' ? chalk.hex('#ff5c7a')('CRITICAL') :
                    issue.severity === 'warning' ? chalk.hex('#ffcf5c')('WARNING') :
                    chalk.hex('#74d7ff')('INFO');
        console.log(`  ${icon} ${sev}${issue.file ? chalk.hex('#899691')(` [${issue.file}]`) : ''}`);
        console.log(`  ${chalk.hex('#899691')('\u2502')}  ${chalk.hex('#f7fff9')(issue.message)}`);
        if (issue.suggestion) {
          console.log(`  ${chalk.hex('#899691')('\u2502')}  ${chalk.hex('#82f7a6')('\u21E8')} ${chalk.hex('#899691')(issue.suggestion)}`);
        }
        console.log('');
      }
    }

    if (analysis.missingFiles.length > 0) {
      logger.subsection('Missing Files');
      for (const f of analysis.missingFiles) {
        console.log(`  ${chalk.hex('#ffcf5c')('\u26A0')} ${chalk.hex('#f7fff9')(f)}`);
      }
      process.stdout.write('\n');
    }

    if (!summaryStreamed) {
      const fallback = createMarkdownStreamRenderer({ title: 'AI Summary' });
      fallback.write(analysis.summary);
      fallback.end();
      process.stdout.write('\n');
    }

    if (project) {
      state.updateProject({ outputs: [...(project.outputs || []), 'Analysis completed'] });
    }

    return {
      success: true,
      message: 'Analysis complete',
      data: analysis as unknown as Record<string, unknown>,
    };
  } catch (error) {
    logger.error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: 'Analysis failed' };
  }
}
