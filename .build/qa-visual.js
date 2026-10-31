// Visual QA: screenshot every page at every target viewport, report overflow offenders.
const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8765';
const PAGES = ['home', 'digital-office', 'about', 'services', 'portfolio', 'stack', 'process', 'contact', 'buddy'];
const WIDTHS = [360, 390, 430, 768, 1440];
const OUT = '/private/var/folders/09/hph3z3wd3kxgx2x_fc8jc4q00000gn/T/opencode/qa';
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const issues = [];
  for (const width of WIDTHS) {
    const height = width < 700 ? 780 : 900;
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
    const failed = [];
    page.on('requestfailed', r => failed.push(r.url()));

    await page.goto(BASE_URL + '/');
    const cta = page.locator('#digital-office-entry button');
    if (await cta.isVisible().catch(() => false)) { await cta.click(); await page.waitForTimeout(400); }
    await page.waitForFunction(() => typeof window.switchPage === 'function');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);

    for (const id of PAGES) {
      await page.evaluate(i => window.switchPage(i), id);
      await page.waitForTimeout(650);
      await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in-view')));
      await page.waitForTimeout(200);
      const report = await page.evaluate(() => {
        const doc = document.documentElement;
        const over = doc.scrollWidth > doc.clientWidth;
        const bad = [];
        const vw = doc.clientWidth;
        document.querySelectorAll('.page-view.active, .page-view.active *').forEach(el => {
          const r = el.getBoundingClientRect();
          const tag = el.tagName ? el.tagName.toLowerCase() : '';
          const name = el.id || el.className || tag;
          if (r.width > 0 && (r.right > vw + 1 || r.left < -1)) {
            const nm = String(name).slice(0, 48);
            if (!bad.some(b => b[0] === nm)) bad.push([nm, Math.round(r.left), Math.round(r.right), vw]);
          }
        });
        return { over, bad: bad.slice(0, 8), sw: doc.scrollWidth, vw };
      });
      if (report.over || report.bad.length) {
        issues.push([width, id, report.sw, report.vw, ...report.bad.slice(0, 4)]);
      }
      if (errors.length) issues.push([width, id, 'JSERR', ...errors.slice(0, 2)]);
      if (failed.length) issues.push([width, id, 'REQFAIL', ...failed.slice(0, 2)]);
      await page.screenshot({ path: path.join(OUT, `${width}-${id}.png`), fullPage: width <= 430 });
    }
    errors.length && console.log(width, 'errs:', errors.slice(0, 3));
    failed.length && console.log(width, 'failed:', failed.slice(0, 3));
    await ctx.close();
  }
  await browser.close();
  if (issues.length) {
    console.log('ISSUES:');
    issues.forEach(i => console.log(JSON.stringify(i)));
  } else {
    console.log('NO OVERFLOW / NO ERRORS / NO FAILED REQUESTS');
  }
  console.log('screenshots in', OUT);
})();
