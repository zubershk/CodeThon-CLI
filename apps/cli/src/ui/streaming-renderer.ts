import { theme } from './theme';

const KEYWORDS: Record<string, string[]> = {
  typescript: [
    'const', 'let', 'var', 'function', 'async', 'await', 'return', 'import',
    'export', 'from', 'class', 'interface', 'type', 'extends', 'implements',
    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
    'try', 'catch', 'throw', 'new', 'this', 'super', 'typeof', 'instanceof',
    'keyof', 'infer', 'readonly', 'static', 'private', 'public', 'protected',
    'abstract', 'declare', 'enum', 'namespace', 'module', 'global',
  ],
  python: [
    'def', 'class', 'return', 'import', 'from', 'as', 'if', 'elif', 'else',
    'for', 'while', 'in', 'not', 'and', 'or', 'is', 'None', 'True', 'False',
    'try', 'except', 'finally', 'raise', 'with', 'as', 'async', 'await',
    'yield', 'lambda', 'pass', 'break', 'continue', 'global', 'nonlocal',
  ],
  javascript: [
    'const', 'let', 'var', 'function', 'async', 'await', 'return', 'import',
    'export', 'from', 'class', 'extends', 'if', 'else', 'for', 'while', 'do',
    'switch', 'case', 'break', 'continue', 'try', 'catch', 'throw', 'new',
    'this', 'typeof', 'instanceof', 'yield', 'delete', 'void',
  ],
};

function detectLanguage(code: string): string {
  if (code.includes('import ') && (code.includes('from ') || code.includes(': '))) return 'typescript';
  if (code.includes('def ') || code.includes('class ') && code.includes(':')) return 'python';
  if (code.includes('function ') || code.includes('=>')) return 'javascript';
  if (code.includes('SELECT ') || code.includes('CREATE TABLE')) return 'sql';
  if (code.startsWith('{') || code.startsWith('[')) return 'json';
  return 'text';
}

const ANSI_COLORS: Record<string, string> = {
  keyword: '\x1b[35m',
  string: '\x1b[32m',
  number: '\x1b[33m',
  comment: '\x1b[90m',
  type: '\x1b[36m',
  function: '\x1b[33m',
  operator: '\x1b[37m',
  punctuation: '\x1b[90m',
  property: '\x1b[94m',
  reset: '\x1b[0m',
};

export class StreamingRenderer {
  private buffer = '';
  private lang = 'text';

  private highlightLine(line: string): string {
    let result = '';

    const tokenRegex = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?\b)|(\b(?:const|let|var|function|async|await|return|import|export|from|class|interface|type|extends|implements|if|else|for|while|do|switch|case|break|continue|try|catch|throw|new|this|typeof|instanceof|keyof|infer|readonly|static|private|public|protected|abstract|declare|enum|namespace)\b)|(\b(?:string|number|boolean|void|null|undefined|never|any|unknown|Record|Partial|Required|Pick|Omit|Promise|Array)\b)|([{}()\[\],;:.])|(\b(?:true|false|null|undefined)\b)|(\S+))/g;

    let match: RegExpExecArray | null;
    let lastIndex = 0;

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        result += line.slice(lastIndex, match.index);
      }
      lastIndex = match.index + match[0].length;

      const token = match[0];
      if (match[2] || match[3] || match[4]) {
        result += `${ANSI_COLORS.string}${token}${ANSI_COLORS.reset}`;
      } else if (match[5]) {
        result += `${ANSI_COLORS.number}${token}${ANSI_COLORS.reset}`;
      } else if (match[6]) {
        result += `${ANSI_COLORS.keyword}${token}${ANSI_COLORS.reset}`;
      } else if (match[7]) {
        result += `${ANSI_COLORS.type}${token}${ANSI_COLORS.reset}`;
      } else if (match[8]) {
        result += `${ANSI_COLORS.punctuation}${token}${ANSI_COLORS.reset}`;
      } else if (match[9]) {
        result += `${ANSI_COLORS.keyword}${token}${ANSI_COLORS.reset}`;
      } else {
        result += token;
      }
    }

    if (lastIndex < line.length) {
      result += line.slice(lastIndex);
    }

    return result;
  }

  streamToken(text: string): string {
    this.buffer += text;
    this.lang = detectLanguage(this.buffer);

    const lines = this.buffer.split('\n');
    const highlightedLines = lines.map(line => {
      if (this.lang === 'text') return line;
      return this.highlightLine(line);
    });

    const result = highlightedLines.join('\n');
    return result;
  }

  append(text: string): string {
    return this.streamToken(text);
  }

  appendWithCursor(text: string): string {
    const highlighted = this.streamToken(text);
    return highlighted + '\u258C';
  }

  getContent(): string {
    return this.buffer;
  }

  reset(): void {
    this.buffer = '';
    this.lang = 'text';
  }
}
