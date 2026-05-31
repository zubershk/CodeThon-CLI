import chalk from 'chalk';
import path from 'path';
import type { CommandResult } from '@codethon/shared-types';
import { ProfilerAgent, type CodeSmellFinding, type PerformanceFinding } from '../features/profiler-agent';
import { logger } from '../utils';

type Finding = PerformanceFinding | CodeSmellFinding;

function severityColor(severity: Finding['severity']): (value: string) => string {
  switch (severity) {
    case 'critical': return chalk.hex('#ff5c7a');
    case 'high': return chalk.hex('#ffcf5c');
    case 'medium': return chalk.hex('#7aa7ff');
    case 'low': return chalk.hex('#899691');
    default: return chalk.hex('#899691');
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

  console.log(`  ${chalk.hex('#74d7ff')('┌')}${chalk.hex('#74d7ff')('─'.repeat(width - 2))}${chalk.hex('#74d7ff')('┐')}`);
  console.log(`  ${chalk.hex('#74d7ff')('│')} ${chalk.hex('#f7fff9').bold('Profile run'.padEnd(inner))} ${chalk.hex('#74d7ff')('│')}`);
  console.log(`  ${chalk.hex('#74d7ff')('├')}${chalk.hex('#74d7ff')('─'.repeat(width - 2))}${chalk.hex('#74d7ff')('┤')}`);
  for (const [label, value] of rows) {
    const text = `${`${label}:`.padEnd(10)} ${value}`;
    const clipped = text.length > inner ? `${text.slice(0, inner - 1)}…` : text.padEnd(inner);
    console.log(`  ${chalk.hex('#74d7ff')('│')} ${chalk.hex('#899691')(clipped)} ${chalk.hex('#74d7ff')('│')}`);
  }
  console.log(`  ${chalk.hex('#74d7ff')('└')}${chalk.hex('#74d7ff')('─'.repeat(width - 2))}${chalk.hex('#74d7ff')('┘')}`);
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
    `  ${chalk.hex('#ff5c7a')(`${counts.critical} critical`)}  ` +
    `${chalk.hex('#ffcf5c')(`${counts.high} high`)}  ` +
    `${chalk.hex('#7aa7ff')(`${counts.medium} medium`)}  ` +
    `${chalk.hex('#899691')(`${counts.low} low`)}  ` +
    `${chalk.hex('#899691')(`${counts.info} info`)}`
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
    console.log(`  ${chalk.hex('#74d7ff').bold(file)}`);
    for (const finding of fileFindings) {
      const color = severityColor(finding.severity);
      const location = 'line' in finding && finding.line ? chalk.hex('#899691')(`:${finding.line}`) : '';
      console.log(`  ${chalk.hex('#899691')('│')} ${color(finding.severity.toUpperCase().padEnd(8))} ${chalk.hex('#f7fff9')(finding.category)}${location}`);
      console.log(`  ${chalk.hex('#899691')('│')}   ${finding.message}`);
      if ('suggestion' in finding && finding.suggestion) {
        console.log(`  ${chalk.hex('#899691')('│')}   ${chalk.hex('#82f7a6')('Fix:')} ${chalk.hex('#899691')(finding.suggestion)}`);
      }
      if ('metric' in finding && finding.metric) {
        console.log(`  ${chalk.hex('#899691')('│')}   ${chalk.hex('#899691')(`Metric: ${finding.metric.value} / threshold ${finding.metric.threshold}`)}`);
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
