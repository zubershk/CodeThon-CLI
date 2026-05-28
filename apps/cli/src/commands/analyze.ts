import chalk from 'chalk';
import path from 'path';
import fs from 'fs';
import type { CommandResult } from '@codethon/shared-types';
import { BuildEngine } from '../cil/build-engine';
import { StateManager } from '../cil/state-manager';
import { logger } from '../utils';
import { renderAgentOutput } from '../utils/render';

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

  logger.section(`CodeThon CLI — Analysis: ${chalk.bold(path.basename(scanDir))}`);
  const engine = new BuildEngine(scanDir);

  try {
    logger.info(`${chalk.cyanBright('\u25B8')} Scanning project structure...\n`);

    const analysis = await engine.analyzeProject();

    logger.labelValue('Name', analysis.name);
    logger.labelValue('Tech Stack', analysis.techStack.join(', ') || chalk.gray('unknown'));
    logger.labelValue('Entry Points', analysis.entryPoints.join(', ') || chalk.gray('none'));
    logger.labelValue('Key Files Found', `${analysis.structure.length}`);
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
          console.log(`  ${chalk.dim('\u2502')} ${prefix}${chalk.dim(connector)}${node.isDir ? chalk.bold.cyanBright(display) + '/' : chalk.whiteBright(display)}`);
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
      console.log(`  ${chalk.dim('\u2502')}  ${chalk.dim('... and ' + (analysis.structure.length - 30) + ' more items')}`);
    }
    process.stdout.write('\n');

    if (analysis.issues.length > 0) {
      logger.subsection('Issues Found');
      for (const issue of analysis.issues) {
        const icon = issue.severity === 'critical' ? chalk.redBright('\u2717') :
                     issue.severity === 'warning' ? chalk.yellowBright('\u26A0') :
                     chalk.cyanBright('\u2139');
        const sev = issue.severity === 'critical' ? chalk.redBright('CRITICAL') :
                    issue.severity === 'warning' ? chalk.yellowBright('WARNING') :
                    chalk.cyanBright('INFO');
        console.log(`  ${icon} ${sev}${issue.file ? chalk.gray(` [${issue.file}]`) : ''}`);
        console.log(`  ${chalk.dim('\u2502')}  ${chalk.whiteBright(issue.message)}`);
        if (issue.suggestion) {
          console.log(`  ${chalk.dim('\u2502')}  ${chalk.greenBright('\u21E8')} ${chalk.gray(issue.suggestion)}`);
        }
        console.log('');
      }
    }

    if (analysis.missingFiles.length > 0) {
      logger.subsection('Missing Files');
      for (const f of analysis.missingFiles) {
        console.log(`  ${chalk.yellowBright('\u26A0')} ${chalk.whiteBright(f)}`);
      }
      process.stdout.write('\n');
    }

    logger.subsection('Summary');
    process.stdout.write('\n');
    renderAgentOutput(analysis.summary);
    process.stdout.write('\n');

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
