// Turns the last test run into a detailed PDF report: reports/test-report-<date>.pdf (git-ignored).
// Reads allure-results/ (Playwright tests) and, if present, reports/k6-*-summary.json (performance).
// Usage: node tools/report-pdf.mjs   (also run automatically by `npm run tests`)
import { chromium, firefox } from '@playwright/test';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import { join } from 'node:path';

const RESULTS = 'allure-results';
const OUT_DIR = 'reports';
// Set by tools/run-tests.mjs so the PDF only shows this run: RUN_STARTED (ms) and REPORT_PLAYWRIGHT=0 when
// no Playwright suite ran. On its own, k6 summaries from up to 30 min before the Playwright run are included.
const includePlaywright = process.env.REPORT_PLAYWRIGHT !== '0';
const siteUrl = process.env.MONSTERS_URL ?? 'https://substandard-monsters.com';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const label = (r, n) => r.labels.find((l) => l.name === n)?.value;
const labels = (r, n) => r.labels.filter((l) => l.name === n).map((l) => l.value);
// Same rule as fixtures/base.ts; used when a test was skipped before its label was attached.
const projectOf = (r) => label(r, 'titlePath')?.split('>')[1]?.trim() ?? '?';
const platformOf = (r) => {
  const p = projectOf(r);
  return label(r, 'platform') ?? (p.startsWith('mobile') ? 'Mobile' : 'Desktop');
};
const plain = (s) => String(s ?? '').replace(/\x1b\[[0-9;]*m/g, '');
const ms = (v) => (v == null || !isFinite(v) ? '—' : v >= 60000 ? `${(v / 60000).toFixed(1)} min` : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);
const pctOf = (n, d) => (d ? `${Math.round((n / d) * 1000) / 10}%` : '—');
const isFail = (s) => s === 'failed' || s === 'broken';

const PROJECT_LABELS = {
  chromium: 'Chrome',
  firefox: 'Firefox',
  edge: 'Edge',
  'mobile-chrome': 'Mobile Chrome',
  'mobile-firefox': 'Mobile Firefox',
  'mobile-edge': 'Mobile Edge',
  'bs-mac-safari': 'Mac Safari (BrowserStack)',
  'bs-mac-chrome': 'Mac Chrome (BrowserStack)',
};
const projLabel = (p) => PROJECT_LABELS[p] ?? p;
const SEVERITY_ORDER = ['blocker', 'critical', 'normal', 'minor', 'trivial'];

// ---- Playwright results ------------------------------------------------------------------
const results =
  includePlaywright && existsSync(RESULTS)
    ? readdirSync(RESULTS)
        .filter((f) => f.endsWith('-result.json'))
        .map((f) => JSON.parse(readFileSync(join(RESULTS, f), 'utf8')))
    : [];

const projects = [...new Set(results.map(projectOf))].sort(
  (a, b) => Object.keys(PROJECT_LABELS).indexOf(a) - Object.keys(PROJECT_LABELS).indexOf(b),
);

// One row per test, with its outcome on each browser/project.
const tests = new Map();
for (const r of results) {
  const t = tests.get(r.fullName) ?? {
    name: r.name,
    file: r.fullName.split(' › ')[0].replace(/\\/g, '/'),
    platform: platformOf(r),
    // Skipped-early tests have no Allure labels; fall back to the file and describe() names.
    site: label(r, 'epic') ?? 'Substandard Monsters',
    feature: label(r, 'feature') ?? label(r, 'subSuite') ?? 'Other',
    story: label(r, 'story') ?? '',
    severity: label(r, 'severity') ?? 'normal',
    tags: [...new Set(labels(r, 'tag'))],
    runs: {},
  };
  t.runs[projectOf(r)] = { status: r.status, duration: (r.stop ?? 0) - (r.start ?? 0), r };
  tests.set(r.fullName, t);
}
const ORDER = { failed: 0, broken: 1, passed: 2, skipped: 3 };
const worst = (runs) => Object.values(runs).map((x) => x.status).sort((a, b) => (ORDER[a] ?? 9) - (ORDER[b] ?? 9))[0];
const all = [...tests.values()].map((t) => ({ ...t, status: worst(t.runs) }));
const count = (list, pred) => list.filter(pred).length;
const totals = {
  passed: count(results, (r) => r.status === 'passed'),
  failed: count(results, (r) => isFail(r.status)),
  skipped: count(results, (r) => r.status === 'skipped'),
};
const total = results.length;
const executed = totals.passed + totals.failed;
const started = Math.min(...results.map((r) => r.start ?? Infinity));
const stopped = Math.max(...results.map((r) => r.stop ?? 0));

/** Deepest failed step name, the place the test actually broke. */
function failedStep(node) {
  for (const s of node.steps ?? []) {
    if (isFail(s.status)) return failedStep(s) ?? s.name;
  }
  return null;
}
function screenshotOf(r) {
  const find = (node) => {
    for (const a of node.attachments ?? []) if (a.type === 'image/png') return a.source;
    for (const s of node.steps ?? []) {
      const hit = find(s);
      if (hit) return hit;
    }
    return null;
  };
  const src = find(r);
  if (!src || !existsSync(join(RESULTS, src))) return null;
  const file = join(RESULTS, src);
  // Full-page phone screenshots can be very tall; embedding many of them crashes the PDF renderer.
  if (statSync(file).size > 600 * 1024) return 'too-large';
  return `data:image/png;base64,${readFileSync(file).toString('base64')}`;
}
/** File:line of the test from its stack trace (first frame inside tests/). */
function locationOf(r) {
  const m = plain(r.statusDetails?.trace ?? '').match(/tests[\\/][^\s:)]+\.spec\.ts:\d+/);
  return m ? m[0].replace(/\\/g, '/') : '';
}

// ---- Environment ----------------------------------------------------------------------------
const require = createRequire(import.meta.url);
const sh = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
async function browserVersion(type, opts = {}) {
  try {
    const b = await type.launch(opts);
    const v = b.version();
    await b.close();
    return v;
  } catch {
    return 'not available';
  }
}
const appVersion = await fetch(`${siteUrl}/script.js`)
  .then((r) => r.text())
  .then((t) => t.match(/SITE_VERSION = '([^']+)'/)?.[1] ?? '—')
  .catch(() => '—');
const env = [
  ['Site', `Substandard Monsters${process.env.MONSTERS_ENV ? ` (${process.env.MONSTERS_ENV})` : ''}: ${siteUrl} · app version ${appVersion}`],
  ['Test code', `${sh('git rev-parse --abbrev-ref HEAD') || '?'} @ ${sh('git rev-parse --short HEAD') || '?'}${sh('git status --porcelain') ? ' (with uncommitted changes)' : ''}`],
  ['Machine', `${os.type()} ${os.release()} · ${os.cpus().length} CPUs · Node ${process.version}`],
  ['Playwright', require('@playwright/test/package.json').version],
  ['Chrome engine', await browserVersion(chromium)],
  ['Firefox', await browserVersion(firefox)],
  ['Edge', await browserVersion(chromium, { channel: 'msedge' })],
];
if (projects.some((p) => p.startsWith('bs-'))) env.push(['BrowserStack', 'macOS Safari (WebKit) and Chrome on BrowserStack cloud machines']);

// ---- k6 performance summaries -----------------------------------------------------------
const k6Since = process.env.RUN_STARTED ? Number(process.env.RUN_STARTED) : isFinite(started) ? started - 30 * 60 * 1000 : 0;
const perf = ['smoke', 'load']
  .map((name) => ({ name, file: join(OUT_DIR, `k6-${name}-summary.json`) }))
  .filter(({ file }) => existsSync(file) && statSync(file).mtimeMs >= k6Since)
  .map(({ name, file }) => {
    const d = JSON.parse(readFileSync(file, 'utf8'));
    const thresholds = Object.entries(d.metrics).flatMap(([metric, m]) =>
      Object.entries(m.thresholds ?? {}).map(([rule, v]) => ({ metric, rule, ok: v.ok })),
    );
    return { name, when: statSync(file).mtime, metrics: d.metrics, thresholds };
  });

// ---- HTML pieces ---------------------------------------------------------------------------
const badge = (s) => `<span class="b ${isFail(s) ? 'failed' : s}">${isFail(s) ? 'failed' : s}</span>`;
const cell = (run) =>
  !run ? '<td class="na">·</td>' : `<td class="c ${isFail(run.status) ? 'f' : run.status === 'passed' ? 'p' : 's'}">${isFail(run.status) ? '✗' : run.status === 'passed' ? '✓' : '–'}<small>${run.status === 'skipped' ? '' : ms(run.duration)}</small></td>`;

const byProject = projects.map((p) => {
  const rs = results.filter((r) => projectOf(r) === p);
  const passed = count(rs, (r) => r.status === 'passed');
  const failed = count(rs, (r) => isFail(r.status));
  return {
    p,
    total: rs.length,
    passed,
    failed,
    skipped: count(rs, (r) => r.status === 'skipped'),
    rate: pctOf(passed, passed + failed),
    time: rs.reduce((a, r) => a + ((r.stop ?? 0) - (r.start ?? 0)), 0),
  };
});

const features = new Map();
for (const t of all) {
  const key = `${t.site} › ${t.feature}`;
  const f = features.get(key) ?? { key, tests: 0, runs: {} };
  f.tests++;
  for (const [p, run] of Object.entries(t.runs)) {
    f.runs[p] ??= { passed: 0, failed: 0, skipped: 0 };
    f.runs[p][isFail(run.status) ? 'failed' : run.status]++;
  }
  features.set(key, f);
}

const severities = SEVERITY_ORDER.map((sev) => {
  const ts = all.filter((t) => t.severity === sev);
  return { sev, tests: ts.length, failing: count(ts, (t) => isFail(t.status)) };
}).filter((s) => s.tests);

const failing = all
  .filter((t) => isFail(t.status))
  .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
const skipped = all.filter((t) => Object.values(t.runs).every((r) => r.status === 'skipped'));
const slowest = all
  .flatMap((t) => Object.entries(t.runs).map(([p, r]) => ({ t, p, d: r.duration, s: r.status })))
  .filter((x) => x.s !== 'skipped')
  .sort((a, b) => b.d - a.d)
  .slice(0, 10);

const matrixHead = `<th>Result</th><th>Test</th>${projects.map((p) => `<th class="pc">${esc(projLabel(p))}</th>`).join('')}`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font: 10px/1.45 "Segoe UI", Arial, sans-serif; color: #1d2433; margin: 0; }
  h1 { font-size: 22px; margin: 0 0 2px; } h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 2px solid #e3e7ef; padding-bottom: 4px; page-break-after: avoid; }
  h3 { font-size: 11.5px; margin: 12px 0 4px; page-break-after: avoid; } .muted { color: #6b7385; }
  .cards { display: flex; gap: 8px; margin: 10px 0; } .card { flex: 1; border: 1px solid #e3e7ef; border-radius: 8px; padding: 8px 10px; }
  .card .n { font-size: 20px; font-weight: 700; } .passed .n { color: #1a7f45; } .failed .n { color: #c2272d; } .skipped .n { color: #8a6d00; }
  .bar { display: flex; height: 10px; border-radius: 5px; overflow: hidden; background: #eee; margin: 4px 0 2px; }
  .bar i { display: block; } .bar .p { background: #2fa465; } .bar .f { background: #d9434a; } .bar .s { background: #e7c24a; }
  table { width: 100%; border-collapse: collapse; } th, td { text-align: left; padding: 3px 5px; border-bottom: 1px solid #edf0f5; vertical-align: top; }
  th { background: #f5f7fb; font-weight: 600; } tr { page-break-inside: avoid; }
  .kv td:first-child { width: 110px; color: #6b7385; }
  .b { display: inline-block; padding: 1px 5px; border-radius: 8px; font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #fff; }
  .b.passed { background: #2fa465; } .b.failed { background: #d9434a; } .b.skipped { background: #c9a227; }
  .pc { text-align: center; width: 62px; font-size: 9px; } td.c { text-align: center; font-weight: 700; } td.c small { display: block; font-weight: 400; color: #8a91a1; font-size: 8px; }
  td.p { color: #1a7f45; } td.f { color: #c2272d; background: #fdf0f0; } td.s { color: #a08000; } td.na { text-align: center; color: #c5cad4; }
  .fail { border: 1px solid #f1c6c8; border-left: 4px solid #d9434a; border-radius: 6px; padding: 7px 9px; margin: 8px 0; page-break-inside: avoid; }
  .fail pre { white-space: pre-wrap; font: 9px/1.4 Consolas, monospace; background: #fbf3f3; padding: 6px; border-radius: 4px; margin: 5px 0 0; max-height: 200px; overflow: hidden; }
  .fail img { max-width: 60%; border: 1px solid #ddd; margin-top: 6px; } .ok { color: #1a7f45; font-weight: 600; } .bad { color: #c2272d; font-weight: 600; }
  .sev { text-transform: capitalize; } .break { page-break-before: always; }
</style></head><body>
<h1>Test report${process.env.REPORT_TITLE ? `: ${esc(process.env.REPORT_TITLE)}` : ''}</h1>
<div class="muted">Playwright TS Automation · ${new Date(isFinite(started) ? started : Date.now()).toLocaleString('en-GB')}${isFinite(started) ? ` · duration ${ms(stopped - started)}` : ''}</div>

<h2>Run details</h2>
<table class="kv">${env.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}
<tr><td>Browsers / devices</td><td>${projects.map(projLabel).map(esc).join(', ') || '—'}</td></tr></table>

${
  total
    ? `<div class="cards">
  <div class="card"><div class="muted">Test runs</div><div class="n">${total}</div><div class="muted">${all.length} tests on ${projects.length} browser(s)/device(s)</div></div>
  <div class="card passed"><div class="muted">Passed</div><div class="n">${totals.passed}</div><div class="muted">${pctOf(totals.passed, executed)} of executed</div></div>
  <div class="card failed"><div class="muted">Failed</div><div class="n">${totals.failed}</div><div class="muted">${failing.length} distinct test(s)</div></div>
  <div class="card skipped"><div class="muted">Skipped</div><div class="n">${totals.skipped}</div><div class="muted">opt-in or not applicable</div></div>
</div>
<div class="bar"><i class="p" style="width:${(totals.passed / total) * 100}%"></i><i class="f" style="width:${(totals.failed / total) * 100}%"></i><i class="s" style="width:${(totals.skipped / total) * 100}%"></i></div>

<h2>By browser / device</h2>
<table><tr><th>Browser / device</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Skipped</th><th>Pass rate</th><th>Test time</th></tr>
${byProject.map((b) => `<tr><td>${esc(projLabel(b.p))}</td><td>${b.total}</td><td>${b.passed}</td><td class="${b.failed ? 'bad' : ''}">${b.failed}</td><td>${b.skipped}</td><td>${b.rate}</td><td>${ms(b.time)}</td></tr>`).join('')}</table>

<h2>By feature and browser</h2>
<table><tr><th>Feature</th><th>Tests</th>${projects.map((p) => `<th class="pc">${esc(projLabel(p))}</th>`).join('')}</tr>
${[...features.values()]
  .map(
    (f) => `<tr><td>${esc(f.key)}</td><td>${f.tests}</td>${projects
      .map((p) => {
        const c = f.runs[p];
        if (!c) return '<td class="na">·</td>';
        return `<td class="c ${c.failed ? 'f' : c.passed ? 'p' : 's'}">${c.failed ? `${c.failed} ✗` : c.passed ? `${c.passed} ✓` : '–'}</td>`;
      })
      .join('')}</tr>`,
  )
  .join('')}</table>

<h2>By severity</h2>
<table><tr><th>Severity</th><th>Tests</th><th>Failing</th></tr>
${severities.map((s) => `<tr><td class="sev">${esc(s.sev)}</td><td>${s.tests}</td><td class="${s.failing ? 'bad' : 'ok'}">${s.failing}</td></tr>`).join('')}</table>

<h2 class="${failing.length ? 'break' : ''}">Failures (${failing.length})</h2>
${
  failing.length
    ? failing
        .map((t) => {
          const bad = Object.entries(t.runs).filter(([, r]) => isFail(r.status));
          const [, first] = bad[0];
          const step = failedStep(first.r);
          const shot = screenshotOf(first.r);
          return `<div class="fail"><b>${esc(t.name)}</b>
<table class="kv" style="margin-top:4px">
<tr><td>Where</td><td>${esc(t.site)} › ${esc(t.feature)}${t.story ? ` › ${esc(t.story)}` : ''} · ${esc(locationOf(first.r) || t.file)}</td></tr>
<tr><td>Severity</td><td class="sev">${esc(t.severity)}${t.tags.length ? ` · tags: ${esc(t.tags.join(', '))}` : ''}</td></tr>
<tr><td>Failed on</td><td>${esc(bad.map(([p]) => projLabel(p)).join(', '))}; passed on ${esc(Object.entries(t.runs).filter(([, r]) => r.status === 'passed').map(([p]) => projLabel(p)).join(', ') || 'none')}</td></tr>
${step ? `<tr><td>Failing step</td><td>${esc(step)}</td></tr>` : ''}
</table>
<pre>${esc(plain(first.r.statusDetails?.message).split('\n').slice(0, 16).join('\n'))}</pre>${
            shot === 'too-large' ? '<div class="muted">Screenshot too large for the PDF: see the Allure report.</div>' : shot ? `<img src="${shot}">` : ''
          }</div>`;
        })
        .join('')
    : '<p class="ok">No failures.</p>'
}

${
  skipped.length
    ? `<h2>Skipped tests (${skipped.length})</h2><table><tr><th>Test</th><th>Reason</th></tr>${skipped
        .map((t) => {
          const r = Object.values(t.runs)[0].r;
          const reason = plain(r.statusDetails?.message) || 'skipped';
          return `<tr><td>${esc(t.name)}<div class="muted">${esc(t.file)}</div></td><td>${esc(reason.split('\n')[0])}</td></tr>`;
        })
        .join('')}</table>`
    : ''
}

<h2>Slowest tests</h2>
<table><tr><th>Test</th><th>Browser / device</th><th>Time</th><th>Result</th></tr>
${slowest.map((x) => `<tr><td>${esc(x.t.name)}<div class="muted">${esc(x.t.feature)}</div></td><td>${esc(projLabel(x.p))}</td><td>${ms(x.d)}</td><td>${badge(x.s)}</td></tr>`).join('')}</table>`
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
    ? `<h2 class="break">All tests (${all.length})</h2>
<div class="muted" style="margin-bottom:4px">✓ passed · ✗ failed · – skipped · · not run on that browser. Time per browser below each mark.</div>
${[...new Set(all.map((t) => `${t.site} · ${t.platform}`))]
  .map((group) => {
    const rows = all
      .filter((t) => `${t.site} · ${t.platform}` === group)
      .sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9) || a.feature.localeCompare(b.feature) || a.name.localeCompare(b.name));
    return `<h3>${esc(group)} (${rows.length})</h3><table><tr>${matrixHead}</tr>${rows
      .map(
        (t) => `<tr><td style="width:56px">${badge(t.status)}</td><td>${esc(t.name)}<div class="muted">${esc(t.feature)}${t.story ? ` › ${esc(t.story)}` : ''} · <span class="sev">${esc(t.severity)}</span></div></td>${projects
          .map((p) => cell(t.runs[p]))
          .join('')}</tr>`,
      )
      .join('')}</table>`;
  })
  .join('')}`
    : ''
}
</body></html>`;

// ---- PDF -----------------------------------------------------------------------------------
mkdirSync(OUT_DIR, { recursive: true });
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
// REPORT_SUFFIX (e.g. a browser name) keeps one PDF per run when the runner tests browsers one by one.
const suffix = process.env.REPORT_SUFFIX ? `-${process.env.REPORT_SUFFIX}` : '';
const out = join(OUT_DIR, `test-report-${stamp}${suffix}.pdf`);
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: out,
  format: 'A4',
  printBackground: true,
  margin: { top: '14mm', bottom: '16mm', left: '10mm', right: '10mm' },
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate:
    '<div style="font-size:8px;color:#888;width:100%;text-align:center">Playwright TS Automation · test report · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
});
await browser.close();
console.log(`PDF report: ${out}`);
