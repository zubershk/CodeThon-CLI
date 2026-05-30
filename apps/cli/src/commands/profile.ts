import chalk from 'chalk';
import path from 'path';
import type { CommandResult } from '@codethon/shared-types';
import { ProfilerAgent, type CodeSmellFinding, type PerformanceFinding } from '../features/profiler-agent';
import { logger } from '../utils';

type Finding = PerformanceFinding | CodeSmellFinding;

function severityColor(severity: Finding['severity']): (value: string) => string {
  switch (severity) {
    case 'critical': return chalk.redBright;
    case 'high': return chalk.yellowBright;
    case 'medium': return chalk.blueBright;
    case 'low': return chalk.gray;
    default: return chalk.dim;
  }
}

function printProfileRunPanel(root: string): void {
  const width = Math.max(60, Math.min(110, (process.stdout.columns || 88) - 4));
  const inner = width - 4;
  const rows = [
    ['Target', root],
    ['Checks', 'N+1 queries, render waste, memory leaks, long functions, complexity, dependencies, bundle risk'],
    ['Scope', 'monorepo-aware scan of src/app/pages/components/lib/server/apps/packages/services/libs'],
  ];

  console.log(`  ${chalk.cyan('┌')}${chalk.cyan('─'.repeat(width - 2))}${chalk.cyan('┐')}`);
  console.log(`  ${chalk.cyan('│')} ${chalk.bold.whiteBright('Profile run'.padEnd(inner))} ${chalk.cyan('│')}`);
  console.log(`  ${chalk.cyan('├')}${chalk.cyan('─'.repeat(width - 2))}${chalk.cyan('┤')}`);
  for (const [label, value] of rows) {
    const text = `${`${label}:`.padEnd(10)} ${value}`;
    const clipped = text.length > inner ? `${text.slice(0, inner - 1)}…` : text.padEnd(inner);
    console.log(`  ${chalk.cyan('│')} ${chalk.dim(clipped)} ${chalk.cyan('│')}`);
  }
  console.log(`  ${chalk.cyan('└')}${chalk.cyan('─'.repeat(width - 2))}${chalk.cyan('┘')}`);
  console.log('');
}

function printSeveritySummary(findings: Finding[]): void {
  const counts = {
    critical: findings.filter(f => f.severity === 'critical').length,
    high: findings.filter(f => f.severity === 'high').length,
    medium: findings.filter(f => f.severity === 'medium').length,
    low: findings.filter(f => f.severity === 'low').length,
    info: findings.filter(f => f.severity === 'info').length,
  };

  logger.labelValue('Findings', String(findings.length));
  console.log(
    `  ${chalk.redBright(`${counts.critical} critical`)}  ` +
    `${chalk.yellowBright(`${counts.high} high`)}  ` +
    `${chalk.blueBright(`${counts.medium} medium`)}  ` +
    `${chalk.gray(`${counts.low} low`)}  ` +
    `${chalk.dim(`${counts.info} info`)}`
  );
  logger.divider();
}

function printFindings(findings: Finding[]): void {
  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
  const sorted = [...findings].sort(
    (a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity)
  );
  const full = process.env.CODETHON_PROFILE_FULL === '1';
  const display = full ? sorted : sorted.slice(0, 40);
  const byFile = new Map<string, Finding[]>();

  for (const finding of display) {
    const existing = byFile.get(finding.file) || [];
    existing.push(finding);
    byFile.set(finding.file, existing);
  }

  logger.subsection(full ? 'Findings' : 'Top Findings');
  for (const [file, fileFindings] of byFile) {
    console.log(`  ${chalk.bold.cyanBright(file)}`);
    for (const finding of fileFindings) {
      const color = severityColor(finding.severity);
      const location = 'line' in finding && finding.line ? chalk.dim(`:${finding.line}`) : '';
      console.log(`  ${chalk.dim('│')} ${color(finding.severity.toUpperCase().padEnd(8))} ${chalk.whiteBright(finding.category)}${location}`);
      console.log(`  ${chalk.dim('│')}   ${finding.message}`);
      if ('suggestion' in finding && finding.suggestion) {
        console.log(`  ${chalk.dim('│')}   ${chalk.greenBright('Fix:')} ${chalk.dim(finding.suggestion)}`);
      }
      if ('metric' in finding && finding.metric) {
        console.log(`  ${chalk.dim('│')}   ${chalk.dim(`Metric: ${finding.metric.value} / threshold ${finding.metric.threshold}`)}`);
      }
    }
    console.log('');
  }

  if (!full && sorted.length > display.length) {
    logger.info(`${sorted.length - display.length} lower-priority findings hidden. Set CODETHON_PROFILE_FULL=1 to print the full report.`);
  }
}

export async function profileCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Profile');
  const root = process.cwd();
  printProfileRunPanel(root);

  const profiler = new ProfilerAgent(root);
  let lastFileLogAt = 0;
  const findings = await profiler.analyze({
    onProgress: message => logger.info(message),
    onFile: (file, index, total) => {
      const now = Date.now();
      if (index === 1 || index === total || now - lastFileLogAt > 1200) {
        lastFileLogAt = now;
        logger.info(`Scanning ${index}/${total}: ${path.normalize(file)}`);
      }
    },
  });

  if (findings.length === 0) {
    logger.success('No profile findings. No obvious performance or maintainability issues were detected.');
    return { success: true, message: 'No issues found' };
  }

  console.log('');
  printSeveritySummary(findings);
  printFindings(findings);

  return { success: true, message: `${findings.length} issue(s) found` };
}
