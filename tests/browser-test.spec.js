// Playwright browser tests for BUDDY AI PARTNERS static website.
// Run against a locally served dist/ directory (python3 -m http.server 8765 --directory dist)
// or via GitHub Actions which builds and serves automatically.

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BUDDY_TEST_BASE_URL || 'http://localhost:8765';

const SECTIONS = [
  'page-home',
  'page-about',
  'page-services',
  'page-portfolio',
  'page-stack',
  'page-process',
  'page-contact',
];

test.describe('Navigation sections', () => {
  for (const pageId of SECTIONS) {
    test(`switches to ${pageId} and keeps only one active`, async ({ page }) => {
      await page.goto(`${BASE_URL}/`);
      await page.click(`button[data-nav="${pageId}"]`);
      await expect(page.locator(`#${pageId}.active`)).toBeVisible();
      // Exactly one page-view should have the active class
      const activeCount = await page.locator('.page-view.active').count();
      expect(activeCount).toBe(1);
    });
  }
});

test.describe('Mobile navigation', () => {
  test('opens hamburger menu and shows all destinations', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 844 });
    await page.goto(`${BASE_URL}/`);
    await page.click('#menuBtn');
    await expect(page.locator('#mobileMenu')).toBeVisible();
    for (const label of ['Home', 'About & Founder', 'Services', 'Portfolio', 'Stack', 'Process', 'Pricing & Contact']) {
      await expect(page.locator('button', { hasText: label })).toBeVisible();
    }
    await page.click('#menuBtn');
    await expect(page.locator('#mobileMenu')).toBeHidden();
  });

  test('does not show horizontal overflow at narrow widths', async ({ page }) => {
    const widths = [360, 390, 430];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);
    }
  });
});

test.describe('Desktop layouts', () => {
  test('renders without horizontal overflow at desktop widths', async ({ page }) => {
    const widths = [1024, 1440];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${BASE_URL}/`);
      await page.waitForLoadState('networkidle');
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(overflow).toBe(false);
    }
  });
});

test.describe('Directory single-root invariant', () => {
  test('exactly one ecoDirectory inside #page-stack', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const roots = page.locator('#ecoDirectory');
    await expect(roots).toHaveCount(1);
    await expect(page.locator('#page-stack #ecoDirectory')).toHaveCount(1);
  });

  test('directory is absent from all other sections', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    for (const pageId of ['page-home', 'page-about', 'page-services', 'page-portfolio', 'page-process', 'page-contact']) {
      await page.click(`button[data-nav="${pageId}"]`);
      await page.waitForLoadState('networkidle');
      const count = await page.locator(`#${pageId} #ecoDirectory`).count();
      expect(count).toBe(0);
    }
  });

  test('directory renders 104 entries after JS render', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.click('button[data-nav="stack"]');
    // Eco-cards are rendered dynamically from ecosystem-data JSON; wait for them
    await page.waitForSelector('#ecoSections .eco-card', { state: 'attached', timeout: 10000 });
    const count = await page.locator('#ecoSections .eco-card').count();
    expect(count).toBe(104);
  });

  test('stack overview renders 10 category groups', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.click('button[data-nav="stack"]');
    // Stack overview groups are rendered dynamically from OVERVIEW data
    await page.waitForSelector('#stackOverview .stack-tier', { state: 'attached', timeout: 10000 });
    const count = await page.locator('#stackOverview .stack-tier').count();
    expect(count).toBe(10);
  });
});

test.describe('Assets load', () => {
  test('logo loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const logo = page.locator('img[src="public/images/logo.svg"]');
    await expect(logo).toHaveAttribute('src', 'public/images/logo.svg');
  });

  test('founder portrait loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const img = page.locator('img#founderImg');
    await expect(img).toHaveAttribute('src', 'public/images/founder-rahul.png');
  });

  test('no JavaScript console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});
