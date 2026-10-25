// Interactive test runner: `npm run tests` asks which suites to run, then runs them and shows the results.
//
// Non-interactive (CI or scripts):
//   npm run tests -- --suite=ui|a11y|perf|all  (comma-separate several, e.g. --suite=ui,perf)
//                    --env=live|dev|local  --preview=<pull request number or preview URL>
//                    --browsers=desktop|mobile|browserstack|all (comma-separate several)
//                    --together (one combined run instead of one run per browser)
//                    --headed (show the browser windows; runs one test at a time unless --workers=N)
//                    --perf=smoke|load|soak  --testiny  --no-report (still builds the Allure report, just doesn't open it)
//                    --exclude="<title regex>" (leave out matching tests, e.g. known failures: --exclude="enough contrast")
// Runs against the LIVE site always upload to Testiny (owner's rule); other sites only with --testiny or "y".
// Testiny run name: <DD.MM.YY>-<environment>-<attempt>, e.g. 20.10.26-live-2 (one run per session).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

try {
  process.loadEnvFile('.env');
} catch {
  // no .env
}

const SUITES = {
  ui: { label: 'UI tests', detail: 'functional browser tests of the site, desktop + mobile' },
  a11y: { label: 'Accessibility tests', detail: 'WCAG 2.2 AA scans and keyboard checks' },
  perf: { label: 'Performance tests', detail: 'k6 against the live Substandard Monsters site' },
};
// Playwright tags that mark the non-UI suites; UI tests are everything without one of them.
const TAGS = { a11y: '@a11y' };

const argv = process.argv.slice(2);
const args = Object.fromEntries(
  argv
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.length ? v.join('=') : true];
    }),
);
// A bare value goes with --preview: `npm run test:preview -- 12`
const positional = argv.filter((a) => !a.startsWith('--'));
if (args.preview === true && positional.length) args.preview = positional[0];
// --interactive forces the questions even without a terminal (e.g. answers piped in).
const interactive = (process.stdin.isTTY || Boolean(args.interactive)) && !args.suite;
const rl = interactive ? createInterface({ input: process.stdin, output: process.stdout, terminal: false }) : null;
// Read answers from a line queue so typed and piped answers both work.
const lines = rl?.[Symbol.asyncIterator]();

async function ask(question, choices, fallback) {
  if (!rl) return fallback;
  for (;;) {
    process.stdout.write(question);
    const next = await lines.next();
    if (next.done) return fallback;
    if (!process.stdin.isTTY) console.log(next.value); // echo piped answers
    const answer = next.value.trim().toLowerCase();
    if (answer === '' && fallback !== undefined) return fallback;
    if (!choices) return next.value.trim();
    if (choices.includes(answer)) return answer;
    console.log(`  Please answer ${choices.join(' / ')}.`);
  }
}

// 1. Which suites
let suites;
if (args.suite) {
  suites = String(args.suite) === 'all' ? Object.keys(SUITES) : String(args.suite).split(',');
} else if (interactive) {
  console.log('\nWhich tests do you want to run?\n');
  const keys = Object.keys(SUITES);
  keys.forEach((k, i) => console.log(`  ${i + 1}) ${SUITES[k].label}  - ${SUITES[k].detail}`));
  console.log(`  ${keys.length + 1}) All of them\n`);
  const all = String(keys.length + 1);
  const choices = keys.map((_, i) => String(i + 1)).concat(all);
  const pick = await ask(`Your choice [1-${all}, default ${all}]: `, choices, all);
  suites = pick === all ? keys : [keys[Number(pick) - 1]];
} else {
  suites = Object.keys(SUITES);
}
const unknown = suites.filter((s) => !SUITES[s]);
if (unknown.length) {
  console.error(`Unknown suite(s): ${unknown.join(', ')}. Use ui, a11y, perf or all.`);
  process.exit(2);
}
const playwrightSuites = suites.filter((s) => s !== 'perf');

// 2. Which copy of the Substandard Monsters site (same names and defaults as sites.ts)
const ENVS = {
  live: { label: 'Live', url: process.env.MONSTERS_LIVE_URL ?? 'https://substandard-monsters.com', detail: 'the published site' },
  dev: { label: 'Dev', url: process.env.MONSTERS_DEV_URL ?? `https://dev--${process.env.MONSTERS_NETLIFY_SITE ?? 'substandard-monsters'}.netlify.app`, detail: 'Netlify preview of the dev branch, before publishing' },
  local: { label: 'Local', url: process.env.MONSTERS_LOCAL_URL ?? 'http://localhost:4173', detail: 'the ../Substandard-Monsters folder on this PC' },
  preview: { label: 'Preview', url: '', detail: "Netlify's temporary deploy preview of a pull request" },
};
/** Netlify's own name for the site (its *.netlify.app subdomain), used for dev and pull request previews. */
const NETLIFY_SITE = process.env.MONSTERS_NETLIFY_SITE ?? 'substandard-monsters';
/** "12" -> https://deploy-preview-12--<netlify site>.netlify.app; a full address is used as is. */
function previewUrl(value) {
  const v = String(value).trim();
  if (/^https?:\/\//.test(v)) return v;
  if (!/^\d+$/.test(v)) return null;
  return `https://deploy-preview-${v}--${NETLIFY_SITE}.netlify.app`;
}

let target = String(args.preview ? 'preview' : (args.env ?? process.env.MONSTERS_ENV ?? (interactive ? '' : 'live'))).toLowerCase();
if (!target) {
  console.log('\nWhich version of the Substandard Monsters site?\n');
  Object.values(ENVS).forEach((e, i) => console.log(`  ${i + 1}) ${e.label}  - ${e.detail}${e.url ? ` (${e.url})` : ''}`));
  console.log('');
  const pick = await ask('Your choice [1-4, default 1]: ', ['1', '2', '3', '4', 'live', 'dev', 'local', 'preview'], '1');
  target = { 1: 'live', 2: 'dev', 3: 'local', 4: 'preview' }[pick] ?? pick;
}
if (!ENVS[target]) {
  console.error(`Unknown environment "${target}". Use live, dev, local or preview.`);
  process.exit(2);
}
if (target === 'preview') {
  let value = args.preview && args.preview !== true ? args.preview : null;
  while (!value || !previewUrl(value)) {
    if (!interactive) {
      console.error('Preview needs a pull request number or address, e.g. --preview=12');
      process.exit(2);
    }
    value = await ask('Pull request number (or full preview address): ', null, null);
  }
  ENVS.preview.url = previewUrl(value);
}
const siteUrl = (process.env.MONSTERS_URL ?? ENVS[target].url).replace(/\/$/, '');

// Deployed copies must answer before we spend minutes testing them.
if (target !== 'local') {
  let reason = '';
  const status = await fetch(siteUrl, { method: 'HEAD' })
    .then((r) => r.status)
    .catch((e) => {
      reason = e.cause?.code ?? e.cause?.message ?? e.message;
      return 0;
    });
  if (status !== 200) {
    console.error(`\n${ENVS[target].label} site ${siteUrl} is not reachable (${status ? `HTTP ${status}` : reason || 'no answer'}).`);
    if (/CERT|SSL|TLS|ALTNAME|SELF_SIGNED/i.test(reason)) {
      console.error(
        "Its HTTPS certificate isn't valid for this address yet. For a new custom domain Netlify issues it\n" +
          'automatically once DNS is verified (Domain management > HTTPS); this can take up to a day.',
      );
    }
    if (target === 'preview') {
      console.error(
        'Deploy previews exist only for open pull requests on a Netlify site linked to GitHub.\n' +
          'Check the pull request on GitHub: Netlify posts the preview link there.',
      );
    }
    if (target === 'dev') {
      console.error(
        'The dev preview only exists when Netlify branch deploys are on for the dev branch and dev has been pushed.\n' +
          'Netlify: Site configuration > Build & deploy > Branches and deploy contexts > Branch deploys > add "dev".',
      );
    }
    process.exit(1);
  }
}

// 3. Follow-up questions, only when relevant
// Which browsers (Playwright projects).
const HAS_BROWSERSTACK = Boolean(process.env.BROWSERSTACK_USERNAME && process.env.BROWSERSTACK_ACCESS_KEY);
const BROWSER_SETS = {
  desktop: { label: 'Desktop: Chrome, Firefox, Edge', projects: ['chromium', 'firefox', 'edge'] },
  mobile: { label: 'Mobile view: Chrome, Firefox and Edge at phone size (all tests + phone layout tests)', projects: ['mobile-chrome', 'mobile-firefox', 'mobile-edge'] },
  browserstack: { label: 'BrowserStack: Safari and Chrome on a Mac', projects: ['bs-mac-safari', 'bs-mac-chrome'] },
};
const browserTests = playwrightSuites;
let browserSets = args.browsers ? String(args.browsers).toLowerCase().split(',') : null;
if (browserSets?.includes('all')) browserSets = ['desktop', 'mobile', ...(HAS_BROWSERSTACK ? ['browserstack'] : [])];
if (!browserSets && browserTests.length && interactive) {
  const options = [
    ['Desktop + mobile view on every browser (default)', ['desktop', 'mobile']],
    [BROWSER_SETS.desktop.label, ['desktop']],
    [BROWSER_SETS.mobile.label, ['mobile']],
    ...(HAS_BROWSERSTACK
      ? [
          [BROWSER_SETS.browserstack.label, ['browserstack']],
          ['All: desktop, mobile and BrowserStack', ['desktop', 'mobile', 'browserstack']],
        ]
      : []),
  ];
  console.log('\nWhich browsers?\n');
  options.forEach(([l], i) => console.log(`  ${i + 1}) ${l}`));
  if (!HAS_BROWSERSTACK) console.log('  (BrowserStack Mac Safari/Chrome: add BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY to .env)');
  console.log('');
  const pick = await ask(`Your choice [1-${options.length}, default 1]: `, options.map((_, i) => String(i + 1)), '1');
  browserSets = options[Number(pick) - 1][1];
}
browserSets ??= ['desktop', 'mobile'];
const unknownSets = browserSets.filter((b) => !BROWSER_SETS[b]);
if (unknownSets.length) {
  console.error(`Unknown browsers "${unknownSets.join(', ')}". Use desktop, mobile, browserstack or all.`);
  process.exit(2);
}
if (browserSets.includes('browserstack')) {
  if (!HAS_BROWSERSTACK) {
    console.error('BrowserStack needs BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY in .env (BrowserStack > Account > Access keys).');
    process.exit(2);
  }
  if (target === 'local') {
    console.error("BrowserStack's cloud browsers can't open this PC's local site. Pick live, dev or a preview.");
    process.exit(2);
  }
}
const browserProjects = browserTests.length ? browserSets.flatMap((b) => BROWSER_SETS[b].projects) : [];
// Default: every browser gets its own run, Allure report and PDF. --together runs them all at once.
const together = Boolean(args.together);

// Visible browser windows instead of headless (only meaningful for local browsers, not BrowserStack).
let headed = Boolean(args.headed);
if (!args.headed && browserTests.length && interactive) {
  headed = (await ask('Show the browser windows while testing (headed)? (y/N): ', ['y', 'n', 'yes', 'no'], 'n')).startsWith('y');
}
// One window at a time is watchable; several parallel windows are not.
const workerFlag = args.workers ? ` --workers=${args.workers}` : headed ? ' --workers=1' : '';
const headedFlag = headed ? ' --headed' : '';

let perfType = args.perf ?? 'smoke';
if (suites.includes('perf') && !args.perf) {
  perfType = await ask(
    'Performance test: (s)moke 30 s, 1 visitor / (l)oad ~2.5 min, up to 10 visitors / soa(k) 15 min, 15 visitors clicking in browsers? [s]: ',
    ['s', 'l', 'k', 'smoke', 'load', 'soak'],
    's',
  );
  perfType = perfType.startsWith('l') ? 'load' : perfType === 'k' || perfType === 'soak' ? 'soak' : 'smoke';
  if (perfType === 'soak') {
    const go = await ask('The soak test runs 15 minutes and starts 15 headless Chrome windows on this PC. Start it? (y/N): ', ['y', 'n', 'yes', 'no'], 'n');
    if (!go.startsWith('y')) {
      console.log('Soak test cancelled; running the smoke test instead.');
      perfType = 'smoke';
    }
  }
}
if (!['smoke', 'load', 'soak'].includes(perfType)) {
  console.error(`Unknown performance test "${perfType}". Use smoke, load or soak.`);
  process.exit(2);
}

// Testiny: always for live runs; otherwise opt-in (--testiny or answer y).
const testinyConfigured = Boolean(process.env.TESTINY_API_KEY && process.env.TESTINY_PROJECT);
let testiny = playwrightSuites.length > 0 && (Boolean(args.testiny) || target === 'live');
if (testiny && !testinyConfigured) {
  console.warn('\nTestiny upload skipped: TESTINY_API_KEY / TESTINY_PROJECT are not set in .env.');
  testiny = false;
} else if (!testiny && playwrightSuites.length && testinyConfigured) {
  testiny = (await ask('Upload the results to Testiny? (y/N): ', ['y', 'n', 'yes', 'no'], 'n')).startsWith('y');
}

/** Same convention and counter file as testiny.ts: <DD.MM.YY>-<environment>-<attempt>. */
function nextRunName(environment, now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const prefix = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${String(now.getFullYear()).slice(-2)}-${environment}`;
  const file = 'reports/testiny-runs.json';
  let counts = {};
  try {
    if (existsSync(file)) counts = JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    counts = {};
  }
  counts[prefix] = (counts[prefix] ?? 0) + 1;
  mkdirSync('reports', { recursive: true });
  writeFileSync(file, JSON.stringify(counts, null, 2));
  return `${prefix}-${counts[prefix]}`;
}
// CI passes its own name (TESTINY_RUN_NAME, e.g. 22.10.26-live-ci-57); locally the counter gives the attempt number.
const testinyRunName = testiny ? process.env.TESTINY_RUN_NAME || nextRunName(target) : null;

let openReport = !args['no-report'];
if (playwrightSuites.length && interactive) {
  openReport = (await ask('Open the Allure report afterwards? (Y/n): ', ['y', 'n', 'yes', 'no'], 'y')).startsWith('y');
}
rl?.close();

// 4. Run
const env = {
  ...process.env,
  MONSTERS_ENV: target,
  MONSTERS_URL: siteUrl,
  ...(testiny ? { TESTINY_UPLOAD: '1', TESTINY_RUN_NAME: testinyRunName } : {}),
};
// Playwright starts the local server itself for MONSTERS_ENV=local, so let it decide.
if (target === 'local' && !process.env.MONSTERS_URL) delete env.MONSTERS_URL;
console.log(`\nSubstandard Monsters: ${ENVS[target].label} (${siteUrl})`);
const run = (cmd, extraEnv = {}) => {
  console.log(`\n> ${cmd}\n`);
  return spawnSync(cmd, { stdio: 'inherit', env: { ...env, ...extraEnv }, shell: true }).status ?? 1;
};
if (testiny) console.log(`Testiny run: ${testinyRunName}`);
const results = [];
const runStarted = Date.now();

const PROJECT_NAMES = {
  chromium: 'Chrome',
  firefox: 'Firefox',
  edge: 'Edge',
  'mobile-chrome': 'Mobile Chrome',
  'mobile-firefox': 'Mobile Firefox',
  'mobile-edge': 'Mobile Edge',
  'bs-mac-safari': 'Mac Safari (BrowserStack)',
  'bs-mac-chrome': 'Mac Chrome (BrowserStack)',
};
const reports = []; // [run name, allure folder, pdf]

/** Builds this run's Allure report and PDF before the next run clears allure-results/. */
function buildReports(slug, title, reportPlaywright) {
  let allureDir = null;
  if (reportPlaywright) {
    allureDir = slug ? `allure-report/by-browser/${slug}` : 'allure-report';
    if (run(`npx allure generate allure-results --output ${allureDir} --name "${title}"`) !== 0) allureDir = null;
  }
  const pdfRun = spawnSync('node tools/report-pdf.mjs', {
    shell: true,
    env: {
      ...env,
      MONSTERS_URL: siteUrl,
      RUN_STARTED: String(runStarted),
      REPORT_PLAYWRIGHT: reportPlaywright ? '1' : '0',
      REPORT_SUFFIX: slug ?? '',
      REPORT_TITLE: title,
    },
    encoding: 'utf8',
  });
  const pdf = pdfRun.stdout?.match(/PDF report: (.+)/)?.[1]?.trim() ?? null;
  if (!pdf) console.error(`\nCould not create the PDF report:\n${pdfRun.stderr ?? ''}`);
  reports.push([title, allureDir, pdf]);
}

if (playwrightSuites.length) {
  // UI = tests without an @a11y tag. With UI chosen, leave out the tagged suites not chosen;
  // without UI, run only the chosen tags.
  const chosenTags = playwrightSuites.filter((s) => TAGS[s]).map((s) => TAGS[s]);
  const otherTags = Object.values(TAGS).filter((t) => !chosenTags.includes(t));
  const filter = playwrightSuites.includes('ui')
    ? otherTags.length
      ? ` --grep-invert "${otherTags.join('|')}"`
      : ''
    : ` --grep "${chosenTags.join('|')}"`;
  // --exclude: also leave out tests whose title matches (e.g. known failures).
  const excludeFilter = args.exclude && args.exclude !== true
    ? filter.startsWith(' --grep-invert ')
      ? filter.replace(/"$/, `|${args.exclude}"`)
      : `${filter} --grep-invert "${args.exclude}"`
    : filter;
  if (excludeFilter !== filter) console.log(`Leaving out tests matching: ${args.exclude}`);
  const name = browserTests.map((s) => SUITES[s].label).join(' + ');
  const flags = (projects) => projects.map((p) => ` --project=${p}`).join('') + headedFlag + workerFlag;

  if (together || browserProjects.length <= 1) {
    const projects = browserProjects;
    const title = playwrightSuites.map((s) => SUITES[s].label).join(' + ') + (browserProjects.length ? ` on ${browserProjects.map((p) => PROJECT_NAMES[p] ?? p).join(', ')}` : '');
    results.push([title, run(`npx playwright test${excludeFilter}${flags(projects)}`)]);
    buildReports(null, title, true);
  } else {
    // One complete run per browser, one after another, each with its own reports.
    // All browsers report into the same Testiny run; only the last Playwright run closes it.
    const lastIndex = browserProjects.length - 1;
    const keepOpen = (i) => (testiny && i < lastIndex ? { TESTINY_COMPLETE_RUN: '0' } : {});
    for (const [i, project] of browserProjects.entries()) {
      const title = `${name} on ${PROJECT_NAMES[project] ?? project}`;
      console.log(`\n================ ${title} ================`);
      results.push([title, run(`npx playwright test${excludeFilter}${flags([project])}`, keepOpen(i))]);
      buildReports(project, title, true);
    }
    // A small start page linking the per-browser Allure reports.
    const links = reports
      .filter(([, dir]) => dir?.startsWith('allure-report/by-browser/'))
      .map(([title, dir], i) => {
        const status = results.find(([n]) => n === title)?.[1] === 0 ? 'passed' : 'failed';
        return `<li class="${status}"><a href="${dir.split('/').pop()}/index.html">${title}</a> <span>${status}</span></li>`;
      })
      .join('\n');
    writeFileSync(
      'allure-report/by-browser/index.html',
      `<!doctype html><meta charset="utf-8"><title>Test reports by browser</title>
<style>body{font:15px system-ui,sans-serif;margin:40px;color:#1d2433}li{margin:10px 0}a{color:#3a5bd9}span{font-size:12px;font-weight:700;text-transform:uppercase;margin-left:8px}.passed span{color:#1a7f45}.failed span{color:#c2272d}</style>
<h1>Test reports by browser</h1><p>${new Date().toLocaleString('en-GB')} · ${ENVS[target].label} (${siteUrl})</p><ul>${links}</ul>`,
    );
  }

  if (openReport && !process.env.CI) {
    const dir = reports.length > 1 ? 'allure-report/by-browser' : reports[0]?.[1];
    if (dir) {
      // Serve it in the background so the runner can finish; the viewer keeps running until closed.
      spawn(`npx allure open ${dir}`, { shell: true, detached: true, stdio: 'ignore' }).unref();
      console.log('\nOpening the Allure report in your browser...');
    }
  }
}

if (suites.includes('perf')) {
  if (spawnSync('k6 version', { shell: true }).status !== 0) {
    console.error('\nk6 is not installed. Install it with: winget install k6 --source winget');
    results.push([`Performance (${perfType})`, 1]);
  } else {
    // k6 has no web server of its own: serve the local folder while it runs.
    const server =
      target === 'local'
        ? spawn('node', ['tools/serve-static.mjs', process.env.MONSTERS_DIR ?? '../Substandard-Monsters', '4173'], { stdio: 'ignore' })
        : null;
    if (server) await new Promise((r) => setTimeout(r, 800));
    const status = run(`npm run -s perf:${perfType} -- -e MONSTERS_URL=${siteUrl}`);
    server?.kill();
    results.push([`Performance (${perfType})`, status]);
    if (existsSync(`reports/k6-${perfType}-report.html`)) {
      console.log(`\nk6 dashboard: reports/k6-${perfType}-report.html`);
    }
    if (existsSync(`reports/k6-${perfType}-report.md`)) {
      console.log(`Performance report: reports/k6-${perfType}-report.md`);
    }
    buildReports('performance', `Performance (${perfType})`, false);
  }
}

// 6. Summary
console.log('\n================ Summary ================');
console.log(`  Site: ${ENVS[target].label} (${siteUrl})`);
for (const [name, status] of results) {
  const [, allureDir, pdf] = reports.find(([t]) => t === name) ?? [];
  console.log(`  ${status === 0 ? 'PASSED' : 'FAILED'}  ${name}`);
  if (allureDir) console.log(`          Allure: ${allureDir}/`);
  if (pdf) console.log(`          PDF:    ${pdf}`);
}
if (reports.length > 1 && existsSync('allure-report/by-browser/index.html')) {
  console.log('  Open all Allure reports in your browser: npm run allure:browsers');
}
// The Testiny reporter doesn't fail the run on upload errors; they appear above as "testiny-reporter: ... errors".
if (testiny) console.log(`  Testiny: results sent as run "${testinyRunName}" (Automation tab). If a line above says "testiny-reporter: finished with errors", the upload failed.`);
console.log('=========================================\n');
process.exit(results.some(([, s]) => s !== 0) ? 1 : 0);
