import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@codethon/llm-client': path.resolve(__dirname, 'src/vendor/llm-client/index.ts'),
      '@codethon/shared-types': path.resolve(__dirname, 'src/vendor/shared-types/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
    sequence: {
      sequencer: class {
        sort(files: string[]) { return files; }
      },
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
