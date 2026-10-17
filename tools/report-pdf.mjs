// Turns the last test run into a PDF report: reports/test-report-<date>.pdf (git-ignored).
// Reads allure-results/ (Playwright tests) and, if present, reports/k6-*-summary.json (performance).
// Usage: node tools/report-pdf.mjs   (also run automatically by `npm run tests`)
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RESULTS = 'allure-results';
const OUT_DIR = 'reports';
// Set by tools/run-tests.mjs so the PDF only shows this run: RUN_STARTED (ms) and REPORT_PLAYWRIGHT=0 when
// no Playwright suite ran. On its own, k6 summaries from up to 30 min before the Playwright run are included.
const includePlaywright = process.env.REPORT_PLAYWRIGHT !== '0';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const label = (r, n) => r.labels.find((l) => l.name === n)?.value;
// Same rule as fixtures/base.ts; used when a test was skipped before its label was attached.
const projectOf = (r) => label(r, 'titlePath')?.split('>')[1]?.trim() ?? '?';
const platformOf = (r) => {
  const p = projectOf(r);
  return label(r, 'platform') ?? (p === 'api' ? 'API' : p.startsWith('mobile') ? 'Mobile' : 'Desktop');
};
const plain = (s) => String(s ?? '').replace(/\x1b\[[0-9;]*m/g, '');

// ---- Playwright results ------------------------------------------------------------------
const results = includePlaywright && existsSync(RESULTS)
  ? readdirSync(RESULTS)
      .filter((f) => f.endsWith('-result.json'))
      .map((f) => JSON.parse(readFileSync(join(RESULTS, f), 'utf8')))
  : [];

// One row per test, with its outcome on each browser/project.
const tests = new Map();
for (const r of results) {
  const project = projectOf(r);
  const key = r.fullName;
  const t = tests.get(key) ?? {
    name: r.name,
    platform: platformOf(r),
    group: [label(r, 'epic'), label(r, 'feature'), label(r, 'story')].filter(Boolean).join(' › ') || label(r, 'suite') || '',
    severity: label(r, 'severity') ?? 'normal',
    runs: [],
  };
  t.runs.push({ project, status: r.status, message: plain(r.statusDetails?.message), r });
  tests.set(key, t);
}

const ORDER = { failed: 0, broken: 1, passed: 2, skipped: 3 };
const worst = (runs) => runs.map((x) => x.status).sort((a, b) => (ORDER[a] ?? 9) - (ORDER[b] ?? 9))[0];
const all = [...tests.values()].map((t) => ({ ...t, status: worst(t.runs) }));
const runCount = (s) => results.filter((r) => r.status === s).length;
const totals = { passed: runCount('passed'), failed: runCount('failed') + runCount('broken'), skipped: runCount('skipped') };
const total = results.length;
const started = Math.min(...results.map((r) => r.start ?? Infinity));
const stopped = Math.max(...results.map((r) => r.stop ?? 0));

function screenshotOf(run) {
  const find = (node) => {
    for (const a of node.attachments ?? []) if (a.type === 'image/png') return a.source;
    for (const s of node.steps ?? []) {
      const hit = find(s);
      if (hit) return hit;
    }
    return null;
  };
  const src = find(run.r);
  if (!src || !existsSync(join(RESULTS, src))) return null;
  return `data:image/png;base64,${readFileSync(join(RESULTS, src)).toString('base64')}`;
}

// ---- k6 performance summaries -----------------------------------------------------------
const k6Since = process.env.RUN_STARTED
  ? Number(process.env.RUN_STARTED)
  : isFinite(started)
    ? started - 30 * 60 * 1000
    : 0;
const perf = ['smoke', 'load']
  .map((name) => ({ name, file: join(OUT_DIR, `k6-${name}-summary.json`) }))
  .filter(({ file }) => existsSync(file) && statSync(file).mtimeMs >= k6Since)
  .map(({ name, file }) => {
    const d = JSON.parse(readFileSync(file, 'utf8'));
    const thresholds = Object.entries(d.metrics).flatMap(([metric, m]) =>
      Object.entries(m.thresholds ?? {}).map(([rule, v]) => ({ metric, rule, ok: v.ok, value: m.values })),
    );
    return { name, when: statSync(file).mtime, metrics: d.metrics, thresholds };
  });

// ---- HTML ----------------------------------------------------------------------------------
const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
const byPlatform = {};
for (const r of results) {
  const p = platformOf(r);
  byPlatform[p] ??= { passed: 0, failed: 0, skipped: 0 };
  byPlatform[p][r.status === 'broken' ? 'failed' : r.status] = (byPlatform[p][r.status === 'broken' ? 'failed' : r.status] ?? 0) + 1;
}
const failed = all.filter((t) => t.status === 'failed' || t.status === 'broken');
const badge = (s) => `<span class="b ${s === 'broken' ? 'failed' : s}">${s === 'broken' ? 'failed' : s}</span>`;
const ms = (v) => (v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(2)} s` : `${Math.round(v)} ms`);

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font: 11px/1.45 "Segoe UI", Arial, sans-serif; color: #1d2433; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 2px; } h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 2px solid #e3e7ef; padding-bottom: 4px; }
  h3 { font-size: 12px; margin: 14px 0 4px; } .muted { color: #6b7385; }
  .cards { display: flex; gap: 10px; margin: 12px 0; } .card { flex: 1; border: 1px solid #e3e7ef; border-radius: 8px; padding: 10px; }
  .card .n { font-size: 22px; font-weight: 700; } .passed .n { color: #1a7f45; } .failed .n { color: #c2272d; } .skipped .n { color: #8a6d00; }
  .bar { display: flex; height: 12px; border-radius: 6px; overflow: hidden; background: #eee; margin: 6px 0 2px; }
  .bar i { display: block; } .bar .p { background: #2fa465; } .bar .f { background: #d9434a; } .bar .s { background: #e7c24a; }
  table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #edf0f5; vertical-align: top; }
  th { background: #f5f7fb; font-weight: 600; } tr { page-break-inside: avoid; }
  .b { display: inline-block; padding: 1px 6px; border-radius: 9px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; color: #fff; }
  .b.passed { background: #2fa465; } .b.failed { background: #d9434a; } .b.skipped { background: #c9a227; }
  .fail { border: 1px solid #f1c6c8; border-left: 4px solid #d9434a; border-radius: 6px; padding: 8px 10px; margin: 8px 0; page-break-inside: avoid; }
  .fail pre { white-space: pre-wrap; font: 9.5px/1.4 Consolas, monospace; background: #fbf3f3; padding: 6px; border-radius: 4px; margin: 6px 0 0; max-height: 220px; overflow: hidden; }
  .fail img { max-width: 55%; border: 1px solid #ddd; margin-top: 6px; } .ok { color: #1a7f45; font-weight: 600; } .bad { color: #c2272d; font-weight: 600; }
</style></head><body>
<h1>Test report</h1>
<div class="muted">Playwright TS Automation · ${new Date(isFinite(started) ? started : Date.now()).toLocaleString('en-GB')}
${isFinite(started) ? ` · duration ${ms(stopped - started)}` : ''}<br>
Sites: Substandard Monsters${process.env.MONSTERS_ENV ? ` <b>${esc(process.env.MONSTERS_ENV)}</b>` : ''} (${esc(process.env.MONSTERS_URL ?? 'https://substandard-monsters.netlify.app')}), saucedemo.com</div>

${
  total
    ? `<div class="cards">
  <div class="card"><div class="muted">Test runs</div><div class="n">${total}</div><div class="muted">${all.length} tests × browsers</div></div>
  <div class="card passed"><div class="muted">Passed</div><div class="n">${totals.passed}</div><div class="muted">${pct(totals.passed)}%</div></div>
  <div class="card failed"><div class="muted">Failed</div><div class="n">${totals.failed}</div><div class="muted">${pct(totals.failed)}%</div></div>
  <div class="card skipped"><div class="muted">Skipped</div><div class="n">${totals.skipped}</div><div class="muted">${pct(totals.skipped)}%</div></div>
</div>
<div class="bar"><i class="p" style="width:${pct(totals.passed)}%"></i><i class="f" style="width:${pct(totals.failed)}%"></i><i class="s" style="width:${pct(totals.skipped)}%"></i></div>

<h2>By platform</h2>
<table><tr><th>Platform</th><th>Passed</th><th>Failed</th><th>Skipped</th></tr>
${Object.entries(byPlatform)
  .map(([p, c]) => `<tr><td>${esc(p)}</td><td>${c.passed ?? 0}</td><td>${c.failed ?? 0}</td><td>${c.skipped ?? 0}</td></tr>`)
  .join('')}</table>

<h2>Failures (${failed.length})</h2>
${
  failed.length
    ? failed
        .map((t) => {
          const bad = t.runs.filter((x) => x.status === 'failed' || x.status === 'broken');
          const shot = screenshotOf(bad[0]);
          return `<div class="fail"><b>${esc(t.name)}</b> <span class="muted">· ${esc(t.group)} · ${esc(t.platform)} · failed on ${esc(bad.map((x) => x.project).join(', '))}</span>
<pre>${esc(bad[0].message.split('\n').slice(0, 14).join('\n'))}</pre>${shot ? `<img src="${shot}">` : ''}</div>`;
        })
        .join('')
    : '<p class="ok">No failures.</p>'
}`
    : '<p class="muted">No Playwright results found in allure-results/.</p>'
}

${
  perf.length
    ? `<h2>Performance (k6)</h2>${perf
        .map(
          (p) => `<h3>${p.name === 'load' ? 'Load test' : 'Smoke test'} <span class="muted">· ${p.when.toLocaleString('en-GB')}</span></h3>
<table><tr><th>Requests</th><th>Failed</th><th>Checks passed</th><th>Max visitors</th><th>p95 all requests</th><th>p95 page TTFB</th></tr>
<tr><td>${p.metrics.http_reqs?.values.count ?? '—'}</td><td>${((p.metrics.http_req_failed?.values.rate ?? 0) * 100).toFixed(2)}%</td>
<td>${((p.metrics.checks?.values.rate ?? 0) * 100).toFixed(1)}%</td><td>${p.metrics.vus_max?.values.max ?? '—'}</td>
<td>${ms(p.metrics.http_req_duration?.values['p(95)'])}</td><td>${ms(p.metrics.page_ttfb?.values['p(95)'])}</td></tr></table>
<table style="margin-top:6px"><tr><th>Threshold</th><th>Rule</th><th>Result</th></tr>
${p.thresholds.map((t) => `<tr><td>${esc(t.metric)}</td><td>${esc(t.rule)}</td><td class="${t.ok ? 'ok' : 'bad'}">${t.ok ? 'passed' : 'FAILED'}</td></tr>`).join('')}</table>`,
        )
        .join('')}`
    : ''
}

${
  total
    ? `<h2>All tests</h2><table><tr><th style="width:62px">Result</th><th>Test</th><th>Area</th><th>Platform</th><th>Browsers</th></tr>
${all
  .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || a.platform.localeCompare(b.platform) || a.group.localeCompare(b.group))
  .map(
    (t) => `<tr><td>${badge(t.status)}</td><td>${esc(t.name)}</td><td class="muted">${esc(t.group)}</td><td>${esc(t.platform)}</td>
<td class="muted">${esc(t.runs.map((x) => `${x.project}${x.status === 'passed' ? '' : ` (${x.status === 'broken' ? 'failed' : x.status})`}`).join(', '))}</td></tr>`,
  )
  .join('')}</table>`
    : ''
}
</body></html>`;

// ---- PDF -----------------------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
const out = join(OUT_DIR, `test-report-${stamp}.pdf`);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  margin: { top: '14mm', bottom: '16mm', left: '12mm', right: '12mm' },
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="font-size:8px;color:#888;width:100%;text-align:center">Playwright TS Automation · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
});
await browser.close();
console.log(`PDF report: ${out}`);
