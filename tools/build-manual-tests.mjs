// Builds "Manual tests/manual-test-cases.csv" and ".pdf" from "Manual tests/manual-test-cases.mjs",
// and checks that every automated UI test has a manual case.
// Usage: npm run manual:build
import { chromium } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const DIR = 'Manual tests';
const { CASES, SITES, PLATFORMS, CASE_VERSION, WRITTEN } = await import(pathToFileURL(join(DIR, 'manual-test-cases.mjs')).href);

const cases = CASES.map((c, i) => ({
  ...c,
  id: `MT-${String(i + 1).padStart(3, '0')}`,
  siteName: SITES[c.site].name,
  appVersion: SITES[c.site].appVersion,
  platformText: PLATFORMS[c.platform],
  platformShort: c.platform === 'desktop' ? 'Desktop' : c.platform === 'tablet' ? 'Tablet' : 'Mobile',
}));

// ---- Coverage check: one manual case per automated UI test ----------------------------------
const list = spawnSync('npx playwright test --list --reporter=json --grep-invert "@api|@a11y"', {
  shell: true,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  env: { ...process.env, MONSTERS_ENV: 'live' },
});
const uiTests = new Map(); // "file:line" -> number of distinct UI tests there (loops share a line)
try {
  const report = JSON.parse(list.stdout);
  const seen = new Set();
  (function walk(suite, titles) {
    for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
    for (const spec of suite.specs ?? []) {
      const key = `${spec.file.replace(/\\/g, '/')}:${spec.line}`;
      const id = `${key}|${titles.join('>')}|${spec.title}`;
      if (seen.has(id)) continue;
      seen.add(id);
      uiTests.set(key, (uiTests.get(key) ?? 0) + 1);
    }
  })({ suites: report.suites }, []);
} catch {
  console.warn('Could not list the automated tests; skipping the coverage check.');
}
if (uiTests.size) {
  const byRef = new Map();
  for (const c of cases) byRef.set(c.auto, (byRef.get(c.auto) ?? 0) + 1);
  const problems = [];
  for (const [ref, n] of uiTests) if ((byRef.get(ref) ?? 0) !== n) problems.push(`${ref}: ${n} automated test(s), ${byRef.get(ref) ?? 0} manual case(s)`);
  for (const ref of byRef.keys()) if (!uiTests.has(ref)) problems.push(`${ref}: manual case points to no automated UI test`);
  const total = [...uiTests.values()].reduce((a, b) => a + b, 0);
  console.log(`Coverage: ${total} automated UI tests, ${cases.length} manual cases${problems.length ? '' : ' - all matched'}.`);
  if (problems.length) console.warn(`Coverage gaps:\n  ${problems.join('\n  ')}`);
}

// ---- CSV (one row per step; Testiny import: steps delimiter "rows", folder delimiter ">") -----
const header = ['ID', 'Title', 'Folder', 'Site', 'Area', 'Platform', 'App version', 'Case version', 'Priority', 'Preconditions', 'Step no', 'Step', 'Expected result', 'Automated test'];
const rows = [header];
for (const c of cases) {
  const folder = `${c.siteName} > ${c.platformShort} > ${c.area}`;
  c.steps.forEach(([step, expected], i) => {
    const first = i === 0;
    rows.push([
      c.id,
      c.title,
      folder,
      first ? c.siteName : '',
      first ? c.area : '',
      first ? c.platformText : '',
      first ? c.appVersion : '',
      first ? CASE_VERSION : '',
      first ? c.priority : '',
      first ? c.pre : '',
      i + 1,
      step,
      expected,
      first ? c.auto : '',
    ]);
  });
}
const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
writeFileSync(join(DIR, 'manual-test-cases.csv'), '﻿' + csv + '\r\n', 'utf8');

// ---- PDF ---------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const prioClass = (p) => p.toLowerCase();
const groups = [];
for (const c of cases) {
  const g = `${c.siteName} · ${c.platformShort === 'Tablet' ? 'Mobile' : c.platformShort}`;
  if (groups.at(-1)?.name !== g) groups.push({ name: g, cases: [] });
  groups.at(-1).cases.push(c);
}

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font: 10.5px/1.45 "Segoe UI", Arial, sans-serif; color: #1d2433; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 15px; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #e3e7ef; page-break-after: avoid; }
  .muted { color: #6b7385; } table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 4px 6px; border: 1px solid #e3e7ef; vertical-align: top; } th { background: #f5f7fb; font-weight: 600; }
  .toc td { border: none; border-bottom: 1px solid #f0f2f6; padding: 2px 6px; } .toc .id { width: 52px; font-weight: 600; }
  .case { border: 1px solid #d9dee8; border-radius: 8px; margin: 0 0 12px; page-break-inside: avoid; overflow: hidden; }
  .case .head { background: #f5f7fb; padding: 7px 10px; border-bottom: 1px solid #d9dee8; }
  .case .head b { font-size: 12.5px; } .case .head .id { color: #3a5bd9; font-weight: 700; margin-right: 6px; }
  .meta { width: 100%; } .meta td { border: none; padding: 2px 10px; } .meta td.k { width: 110px; color: #6b7385; }
  .body { padding: 6px 10px 10px; } .steps th:first-child, .steps td:first-child { width: 22px; text-align: center; }
  .steps td:nth-child(2), .steps th:nth-child(2) { width: 50%; }
  .p { display: inline-block; padding: 1px 6px; border-radius: 9px; font-size: 9px; font-weight: 700; color: #fff; }
  .p.critical { background: #c2272d; } .p.high { background: #e07b17; } .p.medium { background: #3a5bd9; } .p.low { background: #7b8496; }
  .break { page-break-before: always; }
</style></head><body>
<h1>Manual test cases</h1>
<div class="muted">Playwright TS Automation · ${cases.length} cases, one for each automated UI test · case version ${CASE_VERSION} · written ${WRITTEN}</div>
<table style="margin-top:10px"><tr><th>Site</th><th>Address</th><th>App version</th></tr>
${Object.values(SITES).map((s) => `<tr><td>${esc(s.name)}</td><td>${esc(s.url)}</td><td>${esc(s.appVersion)}</td></tr>`).join('')}</table>
<table style="margin-top:8px"><tr><th>Platform</th><th>Meaning</th></tr>
${Object.entries(PLATFORMS).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>

<h2>Contents</h2>
${groups
  .map(
    (g) => `<div style="margin:6px 0 2px;font-weight:600">${esc(g.name)}</div><table class="toc">${g.cases
      .map((c) => `<tr><td class="id">${c.id}</td><td>${esc(c.title)}</td><td class="muted">${esc(c.area)}</td><td><span class="p ${prioClass(c.priority)}">${esc(c.priority)}</span></td></tr>`)
      .join('')}</table>`,
  )
  .join('')}

${groups
  .map(
    (g) => `<h2 class="break">${esc(g.name)}</h2>${g.cases
      .map(
        (c) => `<div class="case"><div class="head"><span class="id">${c.id}</span><b>${esc(c.title)}</b></div>
<table class="meta">
<tr><td class="k">Site / area</td><td>${esc(c.siteName)} › ${esc(c.area)}</td></tr>
<tr><td class="k">Platform</td><td>${esc(c.platformText)}</td></tr>
<tr><td class="k">Version</td><td>App ${esc(c.appVersion)} · test case ${CASE_VERSION}</td></tr>
<tr><td class="k">Priority</td><td><span class="p ${prioClass(c.priority)}">${esc(c.priority)}</span></td></tr>
<tr><td class="k">Preconditions</td><td>${esc(c.pre)}</td></tr>
<tr><td class="k">Automated test</td><td class="muted">${esc(c.auto)}</td></tr>
</table>
<div class="body"><table class="steps"><tr><th>#</th><th>Step</th><th>Expected result</th></tr>
${c.steps.map(([st, ex], i) => `<tr><td>${i + 1}</td><td>${esc(st)}</td><td>${esc(ex)}</td></tr>`).join('')}</table></div></div>`,
      )
      .join('')}`,
  )
  .join('')}
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: join(DIR, 'manual-test-cases.pdf'),
  format: 'A4',
  printBackground: true,
  margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="font-size:8px;color:#888;width:100%;text-align:center">Manual test cases · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
});
await browser.close();
console.log(`Wrote ${cases.length} cases (${rows.length - 1} step rows): ${DIR}/manual-test-cases.csv and .pdf`);
