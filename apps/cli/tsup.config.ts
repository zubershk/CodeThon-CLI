import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  outDir: 'dist',
  clean: true,
  dts: false,
  loader: {
    '.txt': 'text',
  },
  noExternal: ['@codethon/llm-client', '@codethon/shared-types'],
  target: 'node20',
  platform: 'node',
  bundle: true,
  treeshake: true,
});
