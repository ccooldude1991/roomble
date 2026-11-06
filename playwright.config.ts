import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests run against the built + previewed static site.
 *
 * Mobile and desktop are equal priority, so every smoke test runs at all four
 * required viewports as separate projects:
 *   375x667  (small phone)   390x844  (modern phone)
 *   768x1024 (tablet)        1440x900 (desktop)
 */
const PORT = 4321;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'phone-375x667',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 667 }, isMobile: false },
    },
    {
      name: 'phone-390x844',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: false },
    },
    {
      name: 'tablet-768x1024',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, isMobile: false },
    },
    {
      name: 'desktop-1440x900',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
  ],
  // Build once, then preview the static output and test against it.
  webServer: {
    command: 'npm run build && npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
