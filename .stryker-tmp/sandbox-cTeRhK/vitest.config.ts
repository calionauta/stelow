// @ts-nocheck
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['extensions/**/*.ts', 'scripts/**/*.ts'],
      exclude: ['node_modules', '**/*.d.ts'],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});