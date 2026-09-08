import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['scripts/**/*.ts'],
      exclude: ['node_modules', '**/*.d.ts'],
    },
    // SW-009: bumped from 10000 to 30000 to absorb cold-cache CI flake
    // on GitHub Actions shared runners (8 timeout failures on 779d4ba
    // v0.55.0 across concurrency/file-lock/property-based suites).
    // Local runs still complete in well under 10s; the headroom is
    // for environmental variance, not test-code changes.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
