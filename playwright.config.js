// Playwright configuration for the static BUDDY AI PARTNERS site.
// The site is served from dist/ by a local static server (see tests/browser-test.spec.js
// header for the commands) or by the CI workflow.
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  outputDir: './tests/results',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
