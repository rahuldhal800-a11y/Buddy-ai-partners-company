// Playwright runner config for BUDDY AI PARTNERS.
// Failure artifacts go to tests/results/ — the path the GitHub Actions
// workflow uploads (see .github/workflows/test.yml).
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  outputDir: './tests/results',
  use: {
    screenshot: 'only-on-failure',
  },
});
