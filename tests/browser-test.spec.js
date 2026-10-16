// Playwright browser tests for BUDDY AI PARTNERS static website.
// Run against a locally served dist/ directory (python3 -m http.server 8765 --directory dist)
// or via GitHub Actions which builds and serves automatically.

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BUDDY_TEST_BASE_URL || 'http://localhost:8765';

// data-nav values on the desktop header buttons map to #page-<id> sections.
const SECTIONS = ['home', 'about', 'services', 'portfolio', 'stack', 'process', 'contact'];

// Load the site and dismiss the cinematic entry portal (if present).
async function openSite(page) {
  await page.goto(`${BASE_URL}/`);
  const cta = page.locator('#digital-office-entry button');
  if (await cta.isVisible().catch(() => false)) {
    await cta.click();
    await expect(page.locator('#digital-office-entry')).toBeHidden();
  }
}

test.describe('Cinematic entry portal', () => {
  test('shows orbital logo, greeting copy and enters the workspace', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    const portal = page.locator('#digital-office-entry');
    await expect(portal).toBeVisible();
    await expect(portal.locator('img[src="public/images/logo-orbital.webp"]')).toBeVisible();
    await expect(portal).toContainText('SECURE CONNECTION ESTABLISHED', { ignoreCase: true });
    await expect(portal).toContainText('BUDDY AI · DIGITAL OFFICE ACTIVE');
    await expect(portal).toContainText('Welcome to our');
    await expect(portal).toContainText('digital office.');
    await expect(portal).toContainText('Sovereign real-estate pipelines, automated CRM workflows, and autonomous AI agents.');
    const cta = portal.locator('button', { hasText: 'Initialize & Enter Workspace' });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(portal).toBeHidden();
    await expect(page.locator('#page-home.active')).toBeVisible();
  });
});

test.describe('Navigation sections', () => {
  for (const pageId of SECTIONS) {
    test(`switches to ${pageId} and keeps only one active`, async ({ page }) => {
      await openSite(page);
      await page.click(`button[data-nav="${pageId}"]`);
      await expect(page.locator(`#page-${pageId}.active`)).toBeVisible();
      // Exactly one page-view should have the active class
      const activeCount = await page.locator('.page-view.active').count();
      expect(activeCount).toBe(1);
    });
  }

  test('Buddy AI header pill switches to the buddy page', async ({ page }) => {
    await openSite(page);
    await page.click('button[aria-label="Open Buddy AI preview chat"]');
    await expect(page.locator('#page-buddy.active')).toBeVisible();
    const activeCount = await page.locator('.page-view.active').count();
    expect(activeCount).toBe(1);
  });
});

test.describe('Mobile navigation', () => {
  const MNAV = ['home', 'about', 'services', 'portfolio', 'stack', 'process', 'buddy', 'contact'];

  test('hamburger is a clean 40x40 tap target', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 844 });
    await openSite(page);
    const box = await page.locator('#menuBtn').boundingBox();
    expect(Math.round(box.width)).toBe(40);
    expect(Math.round(box.height)).toBe(40);
  });

  test('opens hamburger menu and shows all destinations', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 844 });
    await openSite(page);
    await page.click('#menuBtn');
    await expect(page.locator('#mobileMenu')).toBeVisible();
    for (const id of MNAV) {
      await expect(page.locator(`#mobileMenu button[data-mnav="${id}"]`)).toBeVisible();
    }
    await page.click('#menuBtn');
    await expect(page.locator('#mobileMenu')).toBeHidden();
  });

  test('mobile menu navigates and closes itself', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 844 });
    await openSite(page);
    await page.click('#menuBtn');
    await page.click('#mobileMenu button[data-mnav="buddy"]');
    await expect(page.locator('#page-buddy.active')).toBeVisible();
    await expect(page.locator('#mobileMenu')).toBeHidden();
  });

  test('does not show horizontal overflow at narrow widths', async ({ page }) => {
    const widths = [360, 390, 430];
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 });
      await openSite(page);
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
      await openSite(page);
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
    await openSite(page);
    const roots = page.locator('#ecoDirectory');
    await expect(roots).toHaveCount(1);
    await expect(page.locator('#page-stack #ecoDirectory')).toHaveCount(1);
  });

  test('directory is absent from all other sections', async ({ page }) => {
    await openSite(page);
    for (const pageId of ['home', 'about', 'services', 'portfolio', 'process', 'contact']) {
      await page.click(`button[data-nav="${pageId}"]`);
      await page.waitForLoadState('networkidle');
      const count = await page.locator(`#page-${pageId} #ecoDirectory`).count();
      expect(count).toBe(0);
    }
  });

  test('directory renders all 104 entries after JS render', async ({ page }) => {
    await openSite(page);
    await page.click('button[data-nav="stack"]');
    // Main section cards render into #ecoSections; verification-pending
    // entries render into #ecoPending. Together they cover the full dataset.
    await page.waitForSelector('#ecoSections .eco-card', { state: 'attached', timeout: 10000 });
    await page.waitForSelector('#ecoPending .eco-card', { state: 'attached', timeout: 10000 });
    const mainCount = await page.locator('#ecoSections .eco-card').count();
    const pendCount = await page.locator('#ecoPending .eco-card').count();
    expect(mainCount).toBe(99);
    expect(pendCount).toBe(5);
    expect(mainCount + pendCount).toBe(104);
  });

  test('stack overview renders 10 category groups', async ({ page }) => {
    await openSite(page);
    await page.click('button[data-nav="stack"]');
    // Stack overview groups are rendered dynamically from OVERVIEW data
    await page.waitForSelector('#stackOverview .stack-tier', { state: 'attached', timeout: 10000 });
    const count = await page.locator('#stackOverview .stack-tier').count();
    expect(count).toBe(10);
  });
});

test.describe('Assets load', () => {
  test('orbital logo loads in header and logo.svg in footer', async ({ page }) => {
    await openSite(page);
    const headerLogo = page.locator('header img[src="public/images/logo-orbital.webp"]');
    await expect(headerLogo).toHaveCount(1);
    const loaded = await headerLogo.evaluate(i => i.complete && i.naturalWidth > 0);
    expect(loaded).toBe(true);
    const footerLogo = page.locator('img[src="public/images/logo.svg"]');
    await expect(footerLogo).toHaveCount(1);
    await expect(footerLogo).toHaveAttribute('src', 'public/images/logo.svg');
  });

  test('founder portrait loads', async ({ page }) => {
    await openSite(page);
    const img = page.locator('img#founderImg');
    await expect(img).toHaveAttribute('src', 'public/images/founder-rahul.png');
  });

  test('no JavaScript console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await openSite(page);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    expect(errors).toEqual([]);
  });
});
