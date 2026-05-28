import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';
import type { CommandResult } from '@codethon/shared-types';
import { StateManager } from '../cil/state-manager';
import { startAgent, succeedAgent, failAgent } from '../utils/agent-feed';
import { logger } from '../utils';

interface DoctorCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

function checkNodeVersion(): DoctorCheck {
  const v = process.version.slice(1);
  const major = parseInt(v.split('.')[0], 10);
  if (major >= 18) {
    return { name: 'Node.js Version', status: 'pass', message: `${v} (${major >= 20 ? 'latest' : 'supported'})` };
  }
  return { name: 'Node.js Version', status: 'fail', message: `${v} — need >= 18`, fix: 'Install Node.js 18+ from https://nodejs.org' };
}

function checkPackageJson(): DoctorCheck[] {
  if (!fs.existsSync('package.json')) {
    return [{ name: 'package.json', status: 'fail', message: 'Not found', fix: 'Run `npm init` or `ct init`' }];
  }
  try {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const checks: DoctorCheck[] = [];
    checks.push({ name: 'package.json', status: 'pass', message: 'Valid JSON' });

    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    const total = Object.keys(deps).length;
    if (total === 0) {
      checks.push({ name: 'Dependencies', status: 'warn', message: 'No dependencies declared', fix: 'Run `npm install <package>`' });
    } else {
      checks.push({ name: 'Dependencies', status: 'pass', message: `${total} packages declared` });
    }

    if (!pkg.scripts?.build) {
      checks.push({ name: 'Build Script', status: 'warn', message: 'No "build" script defined', fix: 'Add "build" to package.json scripts' });
    } else {
      checks.push({ name: 'Build Script', status: 'pass', message: `"${pkg.scripts.build}"` });
    }

    return checks;
  } catch {
    return [{ name: 'package.json', status: 'fail', message: 'Invalid JSON', fix: 'Fix syntax errors in package.json' }];
  }
}

function checkEnv(): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const envFiles = ['.env', '.env.local', '.env.example'];
  const found = envFiles.filter(f => fs.existsSync(f));
  if (found.length > 0) {
    checks.push({ name: 'Environment Files', status: 'pass', message: found.join(', ') });
  } else {
    checks.push({ name: 'Environment Files', status: 'warn', message: 'No .env files found', fix: 'Create .env.local for local environment variables' });
  }

  // Check for common env vars referenced in code
  try {
    const srcDir = fs.existsSync('src') ? 'src' : '.';
    const files = findAllFiles(srcDir, ['.ts', '.tsx', '.js', '.jsx']);
    const envRefs = new Set<string>();
    for (const f of files) {
      const content = fs.readFileSync(f, 'utf-8');
      const matches = content.match(/process\.env\.([A-Z_]+)/g);
      if (matches) matches.forEach(m => envRefs.add(m.replace('process.env.', '')));
    }
    if (envRefs.size > 0) {
      const actualEnv = loadEnvVars();
      const missing = [...envRefs].filter(v => !actualEnv.has(v));
      if (missing.length > 0) {
        checks.push({ name: 'Missing Env Vars', status: 'warn', message: `${missing.length} referenced but not set: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`, fix: `Add to .env.local: ${missing[0]}=your_value` });
      } else {
        checks.push({ name: 'Environment Variables', status: 'pass', message: `${envRefs.size} referenced, all set` });
      }
    }
  } catch {
    // skip env var check on error
  }

  return checks;
}

function checkConfigFiles(): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const configs = [
    { file: 'tsconfig.json', name: 'TypeScript Config' },
    { file: 'next.config.js', name: 'Next.js Config' },
    { file: 'next.config.ts', name: 'Next.js Config' },
    { file: 'tailwind.config.js', name: 'Tailwind Config' },
    { file: 'tailwind.config.ts', name: 'Tailwind Config' },
  ];
  const found: string[] = [];
  for (const c of configs) {
    if (fs.existsSync(c.file)) found.push(c.name);
  }
  if (found.length > 0) {
    checks.push({ name: 'Config Files', status: 'pass', message: found.join(', ') });
  } else {
    checks.push({ name: 'Config Files', status: 'warn', message: 'No framework configs detected' });
  }
  return checks;
}

function checkTypeScript(): DoctorCheck[] {
  if (!fs.existsSync('tsconfig.json')) return [];
  try {
    execSync('npx tsc --noEmit 2>&1', { timeout: 30000, encoding: 'utf-8' });
    return [{ name: 'TypeScript', status: 'pass', message: 'No errors' }];
  } catch (e: any) {
    const stderr = e.stderr || e.stdout || '';
    const lines = stderr.split('\n').filter((l: string) => l.includes('error'));
    return [{ name: 'TypeScript', status: 'warn', message: `${lines.length} error(s)`, fix: 'Run `npx tsc --noEmit` to see details, then `ct autofix`' }];
  }
}

function findAllFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) results.push(...findAllFiles(full, exts));
      else if (exts.some(ext => e.name.endsWith(ext))) results.push(full);
    }
  } catch { /* skip */ }
  return results;
}

function loadEnvVars(): Set<string> {
  const vars = new Set<string>();
  const envFiles = ['.env.local', '.env'];
  for (const f of envFiles) {
    if (fs.existsSync(f)) {
      try {
        const content = fs.readFileSync(f, 'utf-8');
        for (const line of content.split('\n')) {
          const match = line.match(/^([A-Z_]+)=/);
          if (match) vars.add(match[1]);
        }
      } catch { /* skip */ }
    }
  }
  return vars;
}

export async function doctorCommand(): Promise<CommandResult> {
  logger.section('CodeThon CLI — Doctor');

  const state = new StateManager();
  const project = state.getProject();
  if (project) {
    startAgent('Doctor', 'Running project diagnostics...');
  } else {
    startAgent('Doctor', 'Running environment diagnostics...');
  }

  const checks: DoctorCheck[] = [
    checkNodeVersion(),
    ...checkPackageJson(),
    ...checkEnv(),
    ...checkConfigFiles(),
    ...checkTypeScript(),
  ];

  succeedAgent('Diagnostics complete');
  console.log('');

  const pass = checks.filter(c => c.status === 'pass');
  const warn = checks.filter(c => c.status === 'warn');
  const fail = checks.filter(c => c.status === 'fail');

  for (const c of pass) {
    console.log(`  ${chalk.greenBright('\u2713')} ${chalk.whiteBright(c.name)}: ${chalk.gray(c.message)}`);
  }
  for (const c of warn) {
    console.log(`  ${chalk.yellowBright('\u26A0')} ${chalk.whiteBright(c.name)}: ${chalk.gray(c.message)}`);
    if (c.fix) console.log(`    ${chalk.dim('Fix:')} ${chalk.yellowBright(c.fix)}`);
  }
  for (const c of fail) {
    console.log(`  ${chalk.redBright('\u2717')} ${chalk.whiteBright(c.name)}: ${chalk.gray(c.message)}`);
    if (c.fix) console.log(`    ${chalk.dim('Fix:')} ${chalk.redBright(c.fix)}`);
  }

  console.log('');
  logger.resultSummary('Health Report', [
    `${chalk.greenBright(`${pass.length} passed`)}`,
    `${chalk.yellowBright(`${warn.length} warnings`)}`,
    `${chalk.redBright(`${fail.length} failures`)}`,
    `${chalk.whiteBright(`Total: ${checks.length} checks`)}`,
  ]);

  return { success: fail.length === 0, message: `${checks.length} checks: ${pass.length} passed, ${warn.length} warnings, ${fail.length} failures` };
}
