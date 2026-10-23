// Builds a CSV of test cases for Testiny's "Test cases > Import" from the last test run:
// labels (platform, epic, feature, severity...) from allure-results, named test.step() blocks
// from Playwright's JSON report.
// Usage: npm run export:testiny:run (runs the UI tests with the JSON report, then exports), or
//        npm run export:testiny after a run made with JSON_REPORT=1.
// Import settings in Testiny: Steps delimiter = "rows", Folder delimiter = ">".
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const resultsDir = 'allure-results';
const jsonReport = 'reports/playwright-results.json';
const outFile = 'reports/testiny-test-cases.csv';

const PRIORITY = { blocker: 'Critical', critical: 'High', normal: 'Medium', minor: 'Low', trivial: 'Low' };
const BROWSERS = { Desktop: 'Chrome, Firefox, Edge (desktop)', Mobile: 'Chrome and Edge on a Pixel 7-sized phone' };

const label = (r, name) => r.labels.find((l) => l.name === name)?.value;
const labels = (r, name) => r.labels.filter((l) => l.name === name).map((l) => l.value);
const norm = (path) => path.replace(/\\/g, '/');

/** "file > describe > ... > title" -> names of the test's top-level test.step() blocks. */
const stepsByTest = new Map();
function collect(suite, titles) {
  for (const child of suite.suites ?? []) collect(child, [...titles, child.title]);
  for (const spec of suite.specs ?? []) {
    const key = [norm(spec.file), ...titles, spec.title].join(' > ');
    // A test runs once per browser; keep the longest step list seen (a failing run can stop early).
    const steps = spec.tests.flatMap((t) => t.results[0]?.steps ?? []).map((s) => s.title);
    const unique = [...new Set(steps)];
    if (!stepsByTest.has(key) || unique.length > stepsByTest.get(key).length) stepsByTest.set(key, unique);
  }
}
// --run: first run the UI tests (Chrome, desktop + phone) with the JSON report on and assertion screenshots off.
if (process.argv.includes('--run')) {
  const env = { ...process.env, JSON_REPORT: '1', ASSERT_SCREENSHOTS: '0' };
  spawnSync('npx playwright test --grep-invert @a11y --project=chromium --project=mobile-chrome', { stdio: 'inherit', env, shell: true });
}
if (!existsSync(jsonReport)) {
  console.error(`${jsonReport} not found: run the tests with JSON_REPORT=1 first (npm run export:testiny:run does both).`);
  process.exit(1);
}
// Top-level suites are the spec files; describe() blocks are nested below them.
for (const fileSuite of JSON.parse(readFileSync(jsonReport, 'utf8')).suites) collect(fileSuite, []);

function namedSteps(r) {
  // Allure fullName: "monsters/e2e/request-form.spec.ts › Request form › sends every field..."
  const parts = r.fullName.split(' › ');
  return stepsByTest.get([norm(parts[0]), ...parts.slice(1)].join(' > ')) ?? [];
}

const cases = new Map();
for (const file of readdirSync(resultsDir).filter((f) => f.endsWith('-result.json'))) {
  const r = JSON.parse(readFileSync(join(resultsDir, file), 'utf8'));
  const platform = label(r, 'platform');
  if (!platform) continue; // e.g. the opt-in real-submission test when skipped
  const key = `${platform}|${r.fullName}`;
  const project = label(r, 'titlePath')?.split('>')[1]?.trim();
  const existing = cases.get(key);
  if (existing) {
    if (project) existing.projects.add(project);
    continue;
  }

  const spec = r.fullName.split(' › ')[0]; // "monsters/e2e/request-form.spec.ts"
  const folder = [platform, label(r, 'epic'), label(r, 'feature'), label(r, 'story')].filter(Boolean).join(' > ');
  const severity = label(r, 'severity') ?? 'normal';
  const site = 'https://substandard-monsters.com';

  cases.set(key, {
    folder,
    title: r.name,
    precondition: [
      `Open ${site}.`,
      'Request form emails are NOT sent: the automated test fakes the FormSubmit reply.',
      r.description ? r.description : '',
    ]
      .filter(Boolean)
      .join(' '),
    steps: namedSteps(r),
    priority: PRIORITY[severity] ?? 'Medium',
    tags: [...new Set(labels(r, 'tag'))].join(', '),
    platform,
    automated: spec.replace(/\\/g, '/'),
    projects: new Set(project ? [project] : []),
  });
}

const header = ['folder', 'title', 'precondition', 'steps', 'expected_result', 'priority', 'platform', 'browsers', 'tags', 'automated_test'];
const rows = [header];
const sorted = [...cases.values()].sort((a, b) => a.folder.localeCompare(b.folder) || a.title.localeCompare(b.title));
for (const c of sorted) {
  const common = [c.priority, c.platform, BROWSERS[c.platform], c.tags, `${c.automated} (Playwright: ${[...c.projects].sort().join(', ')})`];
  if (c.steps.length === 0) {
    rows.push([c.folder, c.title, c.precondition, `Check: ${c.title}`, 'Behaves as described in the title', ...common]);
    continue;
  }
  // "rows" mode: same folder + title on every row, one step per row; extra columns only on the first row.
  c.steps.forEach((step, i) => {
    const last = i === c.steps.length - 1;
    rows.push([
      c.folder,
      c.title,
      i === 0 ? c.precondition : '',
      step,
      last ? `All checks pass: ${c.title}` : 'Step completes as described',
      ...(i === 0 ? common : common.map(() => '')),
    ]);
  });
}

const csv = rows.map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
mkdirSync(dirname(outFile), { recursive: true });
// BOM so Excel and Testiny read Polish characters correctly.
writeFileSync(outFile, '﻿' + csv + '\r\n', 'utf8');
console.log(`Wrote ${cases.size} test cases (${rows.length - 1} rows) to ${outFile}`);
