// Runtime smoke test: executes the real inline app scripts from dist/index.html
// against a minimal DOM stub and asserts navigation isolation, directory
// single-render, filters, and demo sequencers. No browser needed.
// Run: node tests/runtime-smoke.js   (exit 0 = pass)
const fs = require('fs');
const path = require('path');
const DIST = path.join(__dirname, '..', 'dist', 'index.html');
const html = fs.readFileSync(DIST, 'utf8');
const inline = (html.match(/<script>([\s\S]*?)<\/script>/g) || [])
  .map(s => s.replace(/^<script>/, '').replace(/<\/script>$/, '')).join('\n;\n');
let failures = [];
function fail(m) { failures.push(m); console.log('FAIL:', m); }
function makeEl(tag, id, cls) {
  const el = {
    tag, id: id || '', _cls: new Set((cls || '').split(/\s+/).filter(Boolean)),
    dataset: {}, style: {}, handlers: {}, attrs: {},
    value: '', textContent: '', _html: '',
  };
  el.classList = {
    add: (...c) => c.forEach(x => el._cls.add(x)),
    remove: (...c) => c.forEach(x => el._cls.delete(x)),
    toggle: (c, f) => { const on = (f === undefined) ? !el._cls.has(c) : !!f; on ? el._cls.add(c) : el._cls.delete(c); return on; },
    contains: (c) => el._cls.has(c),
  };
  Object.defineProperty(el, 'className', { get: () => [...el._cls].join(' '), set: (v) => { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); } });
  Object.defineProperty(el, 'innerHTML', { get: () => el._html, set: (v) => { el._html = String(v); } });
  el.setAttribute = (k, v) => { el.attrs[k] = v; }; el.getAttribute = (k) => el.attrs[k];
  el.addEventListener = (t, f) => { (el.handlers[t] = el.handlers[t] || []).push(f); };
  el.querySelector = () => makeEl('div', null, ''); el.querySelectorAll = () => [];
  el.focus = () => {}; el.scrollIntoView = () => {};
  el.getContext = () => null;
  return el;
}
const reg = {};
const re = /<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g;
let m;
while ((m = re.exec(html)) !== null) {
  const cls = (m[0].match(/class="([^"]*)"/) || [])[1] || '';
  if (!reg[m[2]]) reg[m[2]] = makeEl(m[1], m[2], cls);
  const el = reg[m[2]];
  (m[0].match(/\sdata-[a-z-]+="[^"]*"/g) || []).forEach(a => {
    const eq = a.indexOf('=');
    el.attrs[a.slice(0, eq).trim()] = a.slice(eq + 1).replace(/^"|"$/g, '');
  });
  if (/\shidden(?:\s|>)/.test(m[0])) el.hidden = true;
}
try {
  const dh = html.match(/id="ecosystem-data">\n([\s\S]*?)<\/script>/);
  if (dh && reg['ecosystem-data']) reg['ecosystem-data'].textContent = dh[1];
} catch (e) {}
global.window = global;
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.document = {
  hidden: false, head: makeEl('head', null, ''),
  getElementById: (id) => reg[id] || (reg[id] = makeEl('div', id, '')),
  querySelectorAll: (sel) => {
    if (sel[0] === '#') { const el = reg[sel.slice(1)]; return el ? [el] : []; }
    if (sel === '.page-view') return Object.values(reg).filter(e => e._cls.has('page-view'));
    if (sel === '.nav-btn' || sel === '.mnav-btn' || sel === '.arch-tab' || sel === '.slide-dot') return [];
    return [];
  },
  querySelector: (sel) => {
    const mm = sel.match(/#([A-Za-z0-9_-]+)\s+#([A-Za-z0-9_-]+)/);
    if (mm) return reg[mm[2]] || null; return null;
  },
  createElement: () => makeEl('div', null, ''),
  addEventListener: () => {}, dispatchEvent: () => true,
};
global.matchMedia = () => ({ matches: false });
global.requestAnimationFrame = () => 0; global.cancelAnimationFrame = () => {};
global.setInterval = () => 0; global.clearInterval = () => {};
global.scrollTo = () => {};
global.history = { replaceState() {}, pushState() {}, scrollRestoration: '' };
global.location = { hash: '' };
global.navigator = {};
global.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = v; } };
global.CustomEvent = function (t, d) { this.type = t; this.detail = d && d.detail; };
try {
  eval(inline);
  console.log('APP-EVAL: no uncaught exception');
} catch (e) { fail('app eval threw: ' + e.message); }
try {
  const active = () => Object.values(reg).filter(e => e._cls.has('page-view') && e._cls.has('active')).map(e => e.id);
  for (const pg of ['home', 'stack', 'process', 'contact', 'portfolio', 'services', 'about', 'buddy']) {
    switchPage(pg);
    const a = active();
    if (a.length !== 1 || a[0] !== 'page-' + pg) fail('switchPage(' + pg + '): active=' + JSON.stringify(a));
  }
  console.log('navigation isolation: 8/8 single-active OK');
  const cards = () => (reg['ecoSections'].innerHTML.match(/eco-card/g) || []).length;
  const n1 = cards();
  switchPage('home'); switchPage('stack'); switchPage('stack');
  const n2 = cards();
  console.log('eco cards across nav loop:', n1, n2);
  if (n1 !== n2 || n1 === 0) fail('eco duplication/empty');
  const ov = reg['stackOverview'].innerHTML;
  if ((ov.match(/stack-tier/g) || []).length !== 10) fail('overview groups != 10');
  ECO_STATE.q = 'agent'; ECO_STATE.cat = 'agents'; ECO_STATE.st = 'Researching'; ecoRender();
  if (!reg['ecoSections'].innerHTML.includes('Cursor')) fail('combined filter broken');
  ECO_STATE.q = ''; ECO_STATE.cat = ''; ECO_STATE.st = ''; ecoRender();
  heroStep(); heroStep(); heroStep(); heroStep(); archTick(); setArch('route');
  if (reg['crmStageLabel'].textContent !== 'Booked · human approval') fail('crm demo did not complete cycle: ' + reg['crmStageLabel'].textContent);
  if (!/13/.test(reg['waCount'].textContent)) fail('crm WhatsApp counter did not increment: ' + reg['waCount'].textContent);
  knrTab('matrix'); knrAsk(reg['knrChip1']);
  if (reg['knrMatrixPanel'].hidden !== false) fail('knr spotlight tab did not switch');
  if (!reg['knrAnswer'].textContent) fail('knr Ask Buddy chip did not render an answer');
  simulateWebhook();
  if (!/SIMULATION/.test(reg['aiTerminal'].innerHTML)) fail('terminal test-lead trigger did not render');
  switchPage('buddy');
  baiPick(0); baiPick(0); baiPick(0);
  if (reg['baiBriefGoal'].textContent !== 'More qualified leads') fail('buddy goal capture failed: ' + reg['baiBriefGoal'].textContent);
  reg['baiInput'].value = 'Test User'; baiSend();
  baiPick(0); baiPick(0);
  if (reg['baiBriefName'].textContent !== 'Test User') fail('buddy name capture failed: ' + reg['baiBriefName'].textContent);
  if (!/wa\.me\/917328089908/.test(reg['baiWa'].href || '')) fail('buddy WhatsApp handoff href missing');
  console.log('buddy chat OK;', 'goal=' + reg['baiBriefGoal'].textContent, '| budget=' + reg['baiBriefBudget'].textContent, '| slot=' + reg['baiBriefSlot'].textContent);
  console.log('demos tick OK;',
    'stage=' + reg['crmStageLabel'].textContent,
    'wa=' + reg['waCount'].textContent,
    'progress=' + reg['archProgress'].style.width,
    'count=' + reg['ecoCount'].textContent,
    'knr.answer=' + reg['knrAnswer'].textContent.slice(0, 28) + '…',
    'term.lines=' + (reg['aiTerminal'].innerHTML.match(/<p /g) || []).length);
} catch (e) { fail('assert threw: ' + e.message); }
console.log(failures.length ? ('FAILURES:' + failures.length) : 'ALL-RUNTIME-CHECKS-PASS');
process.exit(failures.length ? 1 : 0);
