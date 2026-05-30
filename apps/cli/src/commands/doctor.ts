import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { execSync } from 'child_process';
import type { CommandResult } from '@codethon/shared-types';
import { logger } from '../utils';
import { getLLMConfig } from '../utils/config';
import { PROVIDER_SETUP } from '../utils/api-error';
import { printActionHints, printHero } from '../utils/experience';

interface DoctorCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  fix?: string;
}

interface PackageCandidate {
  root: string;
  pkg: Record<string, any>;
}

function readPackage(root: string): PackageCandidate | null {
  const packagePath = path.join(root, 'package.json');
  if (!fs.existsSync(packagePath)) return null;
  try {
    return { root, pkg: JSON.parse(fs.readFileSync(packagePath, 'utf-8')) };
  } catch {
    return { root, pkg: {} };
  }
}

function dependencyCount(pkg: Record<string, any>): number {
  return Object.keys(pkg.dependencies || {}).length + Object.keys(pkg.devDependencies || {}).length;
}

function detectPackageRoot(): PackageCandidate | null {
  const cwd = process.cwd();
  const current = readPackage(cwd);
  if (!current) return null;

  const currentDeps = dependencyCount(current.pkg);
  const currentHasBuildSignal = Boolean(
    current.pkg.scripts?.build ||
    current.pkg.scripts?.test ||
    current.pkg.scripts?.typecheck ||
    fs.existsSync(path.join(cwd, 'tsconfig.json')) ||
    fs.existsSync(path.join(cwd, 'vite.config.ts')) ||
    fs.existsSync(path.join(cwd, 'vite.config.js')) ||
    fs.existsSync(path.join(cwd, 'next.config.ts')) ||
    fs.existsSync(path.join(cwd, 'next.config.js')),
  );

  if (currentDeps > 0) return current;

  const nestedRoots = [
    path.join(cwd, 'apps', 'cli'),
    path.join(cwd, 'packages', 'cli'),
    path.join(cwd, 'cli'),
    path.join(cwd, 'app'),
  ];

  for (const root of nestedRoots) {
    const nested = readPackage(root);
    if (nested && dependencyCount(nested.pkg) > 0) return nested;
  }

  if (currentHasBuildSignal) return current;
  return current;
}

function relativeRoot(root: string): string {
  const relative = path.relative(process.cwd(), root);
  return relative || '.';
}

function checkNode(): DoctorCheck {
  const v = process.version.slice(1);
  const major = parseInt(v.split('.')[0], 10);
  if (major >= 18) {
    return { name: 'Node.js installed', status: 'pass', message: `${v}` };
  }
  return { name: 'Node.js installed', status: 'fail', message: `${v} (need 18+)`, fix: 'Install Node.js 18+ from https://nodejs.org' };
}

function checkGit(): DoctorCheck {
  try {
    const v = execSync('git --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    return { name: 'Git installed', status: 'pass', message: v };
  } catch {
    return { name: 'Git installed', status: 'fail', message: 'Not found', fix: 'Install Git from https://git-scm.com' };
  }
}

function checkConfig(): DoctorCheck {
  try {
    const config = getLLMConfig();
    if (config.provider && config.model) {
      return { name: 'Config valid', status: 'pass', message: `${config.provider}/${config.model}` };
    }
    return { name: 'Config valid', status: 'warn', message: 'Incomplete', fix: 'Run ct auth add' };
  } catch (e: any) {
    return { name: 'Config valid', status: 'fail', message: e.message, fix: 'Run ct onboard --reset' };
  }
}

function checkSecretBackend(): DoctorCheck {
  try {
    const { getSecretBackendName } = require('../utils/keychain');
    const name = getSecretBackendName();
    return { name: 'Secret storage', status: 'pass', message: name };
  } catch {
    return { name: 'Secret storage', status: 'warn', message: 'File-based fallback' };
  }
}

async function checkAuth(): Promise<DoctorCheck> {
  const config = getLLMConfig();
  const setup = PROVIDER_SETUP[config.provider];

  if (!setup) {
    return { name: `${config.provider} key valid`, status: 'warn', message: 'Unknown provider' };
  }

  if (!setup.envVar) {
    // Local provider
    try {
      const url = config.provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234';
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return { name: `${config.provider} running`, status: 'pass', message: 'Connected' };
      return { name: `${config.provider} running`, status: 'fail', message: 'Not responding', fix: `Start ${config.provider}` };
    } catch {
      return { name: `${config.provider} running`, status: 'fail', message: 'Not reachable', fix: `Start ${config.provider}` };
    }
  }

  const apiKey = process.env[setup.envVar] || config.apiKey;
  if (!apiKey) {
    return { name: `${config.provider} key valid`, status: 'fail', message: 'Not set', fix: 'Run ct auth add' };
  }

  const urls: Record<string, string> = {
    openai: 'https://api.openai.com/v1/models',
    anthropic: 'https://api.anthropic.com/v1/messages',
    groq: 'https://api.groq.com/openai/v1/models',
    nvidia: 'https://integrate.api.nvidia.com/v1/models',
    deepseek: 'https://api.deepseek.com/v1/models',
    together: 'https://api.together.ai/v1/models',
  };

  const url = urls[config.provider];
  if (!url) return { name: `${config.provider} key valid`, status: 'warn', message: 'No test endpoint' };

  try {
    const headers: Record<string, string> = { 'Authorization': `Bearer ${apiKey}` };
    if (config.provider === 'anthropic') {
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
    }
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10000) });
    if (res.ok) return { name: `${config.provider} key valid`, status: 'pass', message: 'Authenticated' };
    if (res.status === 401 || res.status === 403) {
      return { name: `${config.provider} key valid`, status: 'fail', message: 'Invalid key', fix: 'Run ct auth add' };
    }
    if (res.status === 429) {
      return { name: `${config.provider} key valid`, status: 'warn', message: 'Rate limited' };
    }
    return { name: `${config.provider} key valid`, status: 'warn', message: `HTTP ${res.status}` };
  } catch {
    return { name: `${config.provider} key valid`, status: 'fail', message: 'Connection failed', fix: 'Check internet connection' };
  }
}

function checkNetwork(): DoctorCheck {
  try {
    const command = process.platform === 'win32'
      ? 'ping -n 1 -w 3000 1.1.1.1'
      : 'ping -c 1 -W 3 1.1.1.1';
    execSync(command, { encoding: 'utf-8', timeout: 5000, stdio: 'ignore' });
    return { name: 'Internet available', status: 'pass', message: 'Connected' };
  } catch {
    return { name: 'Internet available', status: 'warn', message: 'Not reachable', fix: 'Check network connection' };
  }
}

function checkProject(): DoctorCheck[] {
  const checks: DoctorCheck[] = [];
  const candidate = detectPackageRoot();
  if (!candidate) {
    checks.push({ name: 'Project detected', status: 'warn', message: 'No package.json', fix: 'Run /init' });
    return checks;
  }
  const projectRoot = candidate.root;
  const pkg = candidate.pkg;
  const rootLabel = relativeRoot(projectRoot);
  checks.push({ name: 'Project detected', status: 'pass', message: rootLabel === '.' ? 'package.json found' : `package.json found in ${rootLabel}` });

  try {
    const deps = dependencyCount(pkg);
    checks.push({ name: 'Dependencies', status: deps > 0 ? 'pass' : 'warn', message: deps > 0 ? `${deps} packages` : 'None declared', fix: deps > 0 ? undefined : 'Run npm install <package>' });
  } catch {
    checks.push({ name: 'package.json', status: 'fail', message: 'Invalid JSON', fix: 'Fix package.json syntax' });
  }

  // Check for npm install
  if (fs.existsSync(path.join(projectRoot, 'node_modules')) || fs.existsSync(path.join(process.cwd(), 'node_modules'))) {
    checks.push({ name: 'node_modules', status: 'pass', message: 'Installed' });
  } else {
    checks.push({ name: 'node_modules', status: 'warn', message: 'Not installed', fix: rootLabel === '.' ? 'Run npm install' : `Run npm install in ${rootLabel}` });
  }

  // Detect build tool
  const hasTsConfig = fs.existsSync(path.join(projectRoot, 'tsconfig.json')) || Boolean(pkg.devDependencies?.typescript || pkg.dependencies?.typescript);
  const hasNext = fs.existsSync(path.join(projectRoot, 'next.config.js')) || fs.existsSync(path.join(projectRoot, 'next.config.ts')) || Boolean(pkg.dependencies?.next || pkg.devDependencies?.next);
  const hasVite = fs.existsSync(path.join(projectRoot, 'vite.config.ts')) || fs.existsSync(path.join(projectRoot, 'vite.config.js')) || Boolean(pkg.dependencies?.vite || pkg.devDependencies?.vite);
  const hasBuildScript = Boolean(pkg.scripts?.build);
  if (hasNext) checks.push({ name: 'Build tool detected', status: 'pass', message: 'Next.js' });
  else if (hasVite) checks.push({ name: 'Build tool detected', status: 'pass', message: 'Vite' });
  else if (hasTsConfig) checks.push({ name: 'Build tool detected', status: 'pass', message: 'TypeScript' });
  else if (hasBuildScript) checks.push({ name: 'Build tool detected', status: 'pass', message: 'package build script' });
  else checks.push({ name: 'Build tool detected', status: 'warn', message: 'Not detected' });

  return checks;
}

export async function doctorCommand(): Promise<CommandResult> {
  printHero(
    'CodeThon Doctor',
    'Checks your local environment, project setup, provider access, and secret storage.',
    'warning',
    'Diagnostics',
  );

  const checks: DoctorCheck[] = [];

  // Sync checks
  checks.push(checkNode());
  checks.push(checkGit());
  checks.push(checkConfig());
  checks.push(checkSecretBackend());
  checks.push(checkNetwork());
  checks.push(...checkProject());

  // Auth check (async — run inline)
  const authCheck = await checkAuth();
  checks.push(authCheck);

  // Render
  const pass = checks.filter(c => c.status === 'pass');
  const warn = checks.filter(c => c.status === 'warn');
  const fail = checks.filter(c => c.status === 'fail');

  for (const c of checks) {
    const icon = c.status === 'pass' ? chalk.green('\u2713')
      : c.status === 'warn' ? chalk.yellow('\u26A0')
      : chalk.red('\u2717');
    const name = c.status === 'pass' ? chalk.white(c.name)
      : c.status === 'warn' ? chalk.white(c.name)
      : chalk.white(c.name);
    const msg = chalk.dim(c.message);
    console.log(`  ${icon} ${name}  ${msg}`);
    if (c.fix && c.status !== 'pass') {
      console.log(`     ${chalk.dim('Fix:')} ${chalk.cyan(c.fix)}`);
    }
  }

  console.log('');
  if (fail.length === 0 && warn.length === 0) {
    logger.success('All checks passed. Ready to build.');
  } else if (fail.length === 0) {
    logger.success(`${pass.length} passed, ${warn.length} warnings. Ready to build.`);
  } else {
    logger.resultSummary('Health Report', [
      `${chalk.green(`${pass.length} passed`)}`,
      `${chalk.yellow(`${warn.length} warnings`)}`,
      `${chalk.red(`${fail.length} failures`)}`,
    ]);
    console.log('');
    logger.info(`  ${chalk.dim('Fix the failures above, then run')} ${chalk.cyanBright('ct doctor')} ${chalk.dim('again.')}`);
  }

  const actions = fail.length > 0
    ? [
        { command: 'auth add', description: 'Reconnect your provider if credentials are missing or invalid.' },
        { command: 'doctor', description: 'Run diagnostics again after fixing the failures.' },
        { command: 'onboard --reset', description: 'Use the guided setup if config is inconsistent.' },
      ]
    : warn.length > 0
      ? [
          { command: 'status', description: 'Review your current project, provider, and model state.' },
          { command: 'plan', description: 'Start planning once the warnings are acceptable.' },
          { command: 'execute "<goal>"', description: 'Run a concrete task when you are ready.' },
        ]
      : [
          { command: 'plan', description: 'Turn your goal into a roadmap and architecture.' },
          { command: 'execute "<goal>"', description: 'Have CodeThon implement a concrete task.' },
          { command: 'review', description: 'Inspect the working tree before shipping changes.' },
        ];

  printActionHints('Recommended next actions', actions, '/');

  return { success: fail.length === 0, message: `${checks.length} checks: ${pass.length} passed, ${warn.length} warnings, ${fail.length} failures` };
}
