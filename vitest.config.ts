import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['**/*.d.ts'],
      thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
      reporter: ['text', 'json-summary'],
    },
  },
});
