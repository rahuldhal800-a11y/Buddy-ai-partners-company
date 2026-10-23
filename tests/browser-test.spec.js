// BUDDY AI PARTNERS — Playwright browser tests.
// Run against a locally served dist/ directory:
//   sh deploy-surge.sh
//   python3 -m http.server 8765 --bind 127.0.0.1 --directory dist &
//   npx playwright test
// or via GitHub Actions which builds and serves automatically.

import { test, expect } from '@playwright/test';

// 127.0.0.1 is used deliberately: on macOS `localhost` can resolve to ::1 and
// hit a different, stale server process instead of the freshly built dist/.
const BASE_URL = process.env.BUDDY_TEST_BASE_URL || 'http://127.0.0.1:8765';

// data-nav values on the desktop header buttons map to #page-<id> sections.
const SECTIONS = ['home', 'about', 'services', 'portfolio', 'stack', 'process', 'contact'];
const PAGE_IDS = [...SECTIONS, 'buddy'];

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
    await expect(portal.locator('img[src*="logo-orbital.webp"]')).toBeVisible();
    await expect(portal).toContainText('Secure Connection Established', { ignoreCase: true });
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

  test('canonical navigation inventory: header, mobile drawer and footer only', async ({ page }) => {
    await openSite(page);
    // Exactly the three canonical nav landmarks exist.
    await expect(page.locator('nav[aria-label="Main Navigation"]')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Mobile Navigation"]')).toHaveCount(1);
    await expect(page.locator('nav[aria-label="Footer Navigation"]')).toHaveCount(1);
    await expect(page.locator('nav')).toHaveCount(3);
    // No orphaned floating/side navigation components exist anywhere in the DOM.
    const orphans = await page.evaluate(() => {
      const selectors = [
        '#oracleNav', '#oracle-nav', '.oracle-nav', '[data-oracle-nav]',
        '#floatingNav', '#floating-nav', '.floating-nav', '.floating-sidebar',
        '#sideNav', '#side-nav', '.side-nav', '.vertical-nav',
        '[aria-label="Oracle Navigation"]', '[data-floating-navigation]',
        '[data-buddy-orphan-nav-hidden="true"]'
      ];
      return selectors.reduce((n, sel) => n + document.querySelectorAll(sel).length, 0);
    });
    expect(orphans).toBe(0);
  });

  test('no navigation-like element hides along the left edge on any page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/`);
    for (const pageId of PAGE_IDS) {
      await page.evaluate((id) => window.switchPage(id), pageId);
      await page.waitForTimeout(250);
      const offenders = await page.evaluate(() => {
        const canonical = 'header, footer, nav[aria-label="Main Navigation"], nav[aria-label="Mobile Navigation"], nav[aria-label="Footer Navigation"]';
        const found = [];
        document.querySelectorAll('body *').forEach((el) => {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          if (cs.position !== 'fixed' && cs.position !== 'sticky') return;
          if (el.matches(canonical) || el.closest(canonical) || el.closest('header, footer')) return;
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          if (r.height > window.innerHeight * 0.98) return; // background layers
          if (r.left < 140 && r.right > 0) {
            found.push(el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + '.' + (el.getAttribute('class') || '').split(' ')[0]);
          }
        });
        return found;
      });
      expect(offenders, `page-${pageId} left-edge floating elements`).toEqual([]);
    }
  });
});

test.describe('Mobile navigation', () => {
  const MNAV = ['home', 'about', 'services', 'portfolio', 'stack', 'process', 'buddy', 'contact'];

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
      await page.waitForFunction(() => typeof window.switchPage === 'function');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
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
      await page.waitForFunction(() => typeof window.switchPage === 'function');
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
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
    await expect(page.locator('#ecoDirectory')).toHaveCount(1);
    await expect(page.locator('#page-stack #ecoDirectory')).toHaveCount(1);
  });

  test('directory is absent from all other sections', async ({ page }) => {
    await openSite(page);
    for (const pageId of ['home', 'about', 'services', 'portfolio', 'process', 'contact']) {
      await page.click(`button[data-nav="${pageId}"]`);
      await expect(page.locator(`#page-${pageId}.active`)).toBeVisible();
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
    await page.waitForSelector('#stackOverview .stack-tier', { state: 'attached', timeout: 10000 });
    const count = await page.locator('#stackOverview .stack-tier').count();
    expect(count).toBe(10);
  });
});

test.describe('Assets load', () => {
  test('logo loads in header and footer', async ({ page }) => {
    await openSite(page);
    const logos = page.locator('img[src="images/logo.svg"]');
    await expect(logos).toHaveCount(2);
    const allLoaded = await logos.evaluateAll((imgs) => imgs.every((i) => i.complete && i.naturalWidth > 0));
    expect(allLoaded).toBe(true);
  });

  test('founder portrait loads', async ({ page }) => {
    await openSite(page);
    const img = page.locator('img#founderImg');
    await expect(img).toHaveAttribute('src', 'images/founder-rahul.png');
    // The portrait is lazy-loaded inside the About page, so make it visible first.
    await page.click('button[data-nav="about"]');
    await expect(page.locator('#page-about.active')).toBeVisible();
    await img.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const el = document.getElementById('founderImg');
      return el && el.complete && el.naturalWidth > 0;
    });
  });

  test('favicon link resolves to an existing file', async ({ page, request }) => {
    await openSite(page);
    const href = await page.getAttribute('link[rel="icon"]', 'href');
    expect(href).toBe('images/logo.svg');
    const res = await request.get(`${BASE_URL}/${href}`);
    expect(res.status()).toBe(200);
  });

  test('no local asset request fails while browsing home and stack', async ({ page }) => {
    const failures = [];
    page.on('requestfailed', (r) => {
      if (r.url().startsWith(BASE_URL)) failures.push(`${r.url()} :: ${r.failure()?.errorText}`);
    });
    page.on('response', (r) => {
      if (r.url().startsWith(BASE_URL) && r.status() >= 400) failures.push(`${r.url()} :: HTTP ${r.status()}`);
    });
    await openSite(page);
    await page.waitForTimeout(600);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(600);
    await page.click('button[data-nav="stack"]');
    await page.waitForSelector('#ecoSections .eco-card', { state: 'attached', timeout: 10000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);
    expect(failures).toEqual([]);
  });

  test('no JavaScript console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await openSite(page);
    await page.waitForFunction(() => typeof window.switchPage === 'function');
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });
});
