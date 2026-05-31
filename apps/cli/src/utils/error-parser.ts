import chalk from 'chalk';

export interface ParsedError {
  file: string;
  line: number;
  col: number;
  message: string;
  severity: 'error' | 'warning';
  source: 'tsc' | 'next' | 'eslint' | 'npm' | 'unknown';
}

const TSC_RE = /^(.+)\((\d+),(\d+)\):\s+(error|warning)\s+(.+)$/gm;
const TSC_RE2 = /^(.+)\.tsx?\((\d+),(\d+)\):\s+(error|warning)\s+(.+)$/gm;
const NEXT_RE = /^(?:- )?(.+):(\d+):(\d+):?\s+(Error|Warning|error|warning):\s+(.+)$/gm;
const ESLINT_RE = /^(\/.+?):(\d+):(\d+):\s+(error|warning)\s+(.+)$/gm;
const NPM_ERR_RE = /^(?:npm\s)?(?:ERR!|error)\s(.+?):\s(.+)$/gm;
const FILE_COLON_LINE = /^(.+?)\((\d+),(\d+)\)/;

export function parseBuildErrors(output: string): ParsedError[] {
  const errors: ParsedError[] = [];
  const seen = new Set<string>();

  const addError = (file: string, line: number, col: number, message: string, severity: 'error' | 'warning', source: ParsedError['source']) => {
    const key = `${file}:${line}:${col}:${message}`;
    if (seen.has(key)) return;
    seen.add(key);
    errors.push({ file, line, col, message: message.trim(), severity, source });
  };

  let match: RegExpExecArray | null;

  while ((match = TSC_RE.exec(output)) !== null) {
    addError(match[1], parseInt(match[2]), parseInt(match[3]), match[5], match[4] === 'error' ? 'error' : 'warning', 'tsc');
  }
  while ((match = TSC_RE2.exec(output)) !== null) {
    addError(match[1], parseInt(match[2]), parseInt(match[3]), match[5], match[4] === 'error' ? 'error' : 'warning', 'tsc');
  }
  while ((match = NEXT_RE.exec(output)) !== null) {
    addError(match[1], parseInt(match[2]), parseInt(match[3]), match[5], match[4].toLowerCase() === 'error' ? 'error' : 'warning', 'next');
  }
  while ((match = ESLINT_RE.exec(output)) !== null) {
    addError(match[1], parseInt(match[2]), parseInt(match[3]), match[5], match[4] === 'error' ? 'error' : 'warning', 'eslint');
  }

  // Fallback: Parse generic file:line:col patterns
  const lines = output.split('\n');
  for (const line of lines) {
    if (line.includes('Error') || line.includes('error')) {
      const fcMatch = line.match(FILE_COLON_LINE);
      if (fcMatch && !errors.some(e => e.file === fcMatch[1])) {
        addError(fcMatch[1], parseInt(fcMatch[2]), parseInt(fcMatch[3]), line, 'error', 'unknown');
      }
    }
  }

  return errors;
}

export function parseNpmErrors(output: string): string[] {
  const errors: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = NPM_ERR_RE.exec(output)) !== null) {
    errors.push(`${match[1]}: ${match[2]}`);
  }
  return errors;
}

export function formatParsedErrors(errors: ParsedError[]): string {
  if (errors.length === 0) return '';
  return errors.map(e =>
    `  ${e.severity === 'error' ? chalk.hex('#ff5c7a')('\u2717') : chalk.hex('#ffcf5c')('\u26A0')} ${chalk.hex('#74d7ff')(`${e.file}:${e.line}:${e.col}`)}  ${chalk.hex('#f7fff9')(e.message)}`
  ).join('\n');
}

export function generateFixSuggestions(errors: ParsedError[]): string[] {
  if (errors.length === 0) return [];

  const suggestions: string[] = [];
  const files = new Set(errors.map(e => e.file));
  const messages = errors.map(e => e.message);

  const hasImportIssues = messages.some(m => /cannot find module|is not a module|module not found/i.test(m));
  const hasTypeIssues = messages.some(m => /Type\s+|is not assignable|is missing|Property\s+.*does not exist/i.test(m));
  const hasSyntaxIssues = messages.some(m => /Unexpected token|Cannot find name|Expression expected/i.test(m));
  const hasMissingDep = messages.some(m => /cannot find module|module not found|Failed to resolve/i.test(m));

  if (hasMissingDep) {
    suggestions.push('Run `npm install` to install missing dependencies');
  }
  if (hasTypeIssues) {
    suggestions.push(`Check type definitions in: ${[...files].slice(0, 3).join(', ')}`);
  }
  if (hasSyntaxIssues) {
    suggestions.push(`Syntax error in: ${[...files].slice(0, 3).join(', ')}`);
  }

  if (errors.length <= 3) {
    suggestions.push(`/build "fix ${errors[0].message.slice(0, 60)}"`);
  } else {
    suggestions.push(`/autofix  (auto-fix ${errors.length} build errors)`);
  }

  return suggestions;
}
