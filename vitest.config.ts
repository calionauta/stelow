import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Runs exactly once before any test file: prepares the
    // gitignored cli-tools mirrors so every test file sees a
    // populated tree without racing the sync script in parallel
    // workers. See `tests/global-setup.ts` for rationale.
    globalSetup: ['./tests/global-setup.ts'],
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
