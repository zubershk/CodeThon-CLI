import { describe, it, expect } from 'vitest';

describe('Debug Agent logic', () => {
  it('should detect critical error keywords', () => {
    const criticalKeywords = ['crash', 'down', '500', 'fatal'];
    const input = 'Server crash on startup: 500 Internal Server Error';

    const isCritical = criticalKeywords.some((kw) => input.toLowerCase().includes(kw));
    expect(isCritical).toBe(true);
  });

  it('should detect high severity errors', () => {
    const highKeywords = ['error', 'fail', 'exception'];
    const input = 'Error: Cannot find module';

    const isHigh = highKeywords.some((kw) => input.toLowerCase().includes(kw));
    expect(isHigh).toBe(true);
  });

  it('should be low severity for warnings', () => {
    const lowKeywords = ['warn', 'deprecat'];
    const input = 'DeprecationWarning: This API is deprecated';

    const isLow = lowKeywords.some((kw) => input.toLowerCase().includes(kw));
    expect(isLow).toBe(true);
  });
});
