import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@codethon/llm-client': resolve(__dirname, 'src/vendor/llm-client/index.ts'),
      '@codethon/shared-types': resolve(__dirname, 'src/vendor/shared-types/index.ts'),
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
