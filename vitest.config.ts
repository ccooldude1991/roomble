import { defineConfig } from 'vitest/config';

// Unit tests for game logic, scoring and services.
// Playwright smoke tests live in tests/e2e and are run separately via `npm run test:e2e`.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules', 'dist'],
    environment: 'node',
  },
});
