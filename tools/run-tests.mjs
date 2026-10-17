// Interactive test runner: `npm run tests` asks which suites to run, then runs them and shows the results.
//
// Non-interactive (CI or scripts):
//   npm run tests -- --suite=ui|api|a11y|perf|all  (comma-separate several, e.g. --suite=ui,perf)
//                    --env=live|dev|local  --preview=<pull request number or preview URL>
//                    --perf=smoke|load  --testiny  --no-report
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

try {
  process.loadEnvFile('.env');
} catch {
  // no .env
}

const SUITES = {
  ui: { label: 'UI tests', detail: 'functional browser tests of both sites, desktop + mobile' },
  api: { label: 'API tests', detail: 'request form backend (FormSubmit), no browser' },
  a11y: { label: 'Accessibility tests', detail: 'WCAG 2.2 AA scans and keyboard checks' },
  perf: { label: 'Performance tests', detail: 'k6 against the live Substandard Monsters site' },
};
// Playwright tags that mark the non-UI suites; UI tests are everything without one of them.
const TAGS = { api: '@api', a11y: '@a11y' };

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
  console.error(`Unknown suite(s): ${unknown.join(', ')}. Use ui, api, a11y, perf or all.`);
  process.exit(2);
}
const playwrightSuites = suites.filter((s) => s !== 'perf');

// 2. Which copy of the Substandard Monsters site (same names and defaults as sites.ts)
const ENVS = {
  live: { label: 'Live', url: process.env.MONSTERS_LIVE_URL ?? 'https://substandard-monsters.netlify.app', detail: 'the published site' },
  dev: { label: 'Dev', url: process.env.MONSTERS_DEV_URL ?? 'https://dev--substandard-monsters.netlify.app', detail: 'Netlify preview of the dev branch, before publishing' },
  local: { label: 'Local', url: process.env.MONSTERS_LOCAL_URL ?? 'http://localhost:4173', detail: 'the ../Substandard-Monsters folder on this PC' },
  preview: { label: 'Preview', url: '', detail: "Netlify's temporary deploy preview of a pull request" },
};
/** "12" -> https://deploy-preview-12--substandard-monsters.netlify.app; a full address is used as is. */
function previewUrl(value) {
  const v = String(value).trim();
  if (/^https?:\/\//.test(v)) return v;
  if (!/^\d+$/.test(v)) return null;
  const liveHost = new URL(ENVS.live.url).host; // substandard-monsters.netlify.app
  return `https://deploy-preview-${v}--${liveHost}`;
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
  const status = await fetch(siteUrl, { method: 'HEAD' }).then((r) => r.status).catch(() => 0);
  if (status !== 200) {
    console.error(`\n${ENVS[target].label} site ${siteUrl} is not reachable (HTTP ${status || 'no answer'}).`);
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
let perfType = args.perf ?? 'smoke';
if (suites.includes('perf') && !args.perf) {
  perfType = await ask('Performance test: (s)moke 30 s, 1 visitor or (l)oad ~2.5 min, up to 10 visitors? [s]: ', ['s', 'l', 'smoke', 'load'], 's');
  perfType = perfType.startsWith('l') ? 'load' : 'smoke';
}

let testiny = Boolean(args.testiny);
if (playwrightSuites.length && !args.testiny && process.env.TESTINY_API_KEY && process.env.TESTINY_PROJECT) {
  testiny = (await ask('Upload the results to Testiny? (y/N): ', ['y', 'n', 'yes', 'no'], 'n')).startsWith('y');
}

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
  ...(testiny ? { TESTINY_UPLOAD: '1' } : {}),
};
// Playwright starts the local server itself for MONSTERS_ENV=local, so let it decide.
if (target === 'local' && !process.env.MONSTERS_URL) delete env.MONSTERS_URL;
console.log(`\nSubstandard Monsters: ${ENVS[target].label} (${siteUrl})`);
const run = (cmd) => {
  console.log(`\n> ${cmd}\n`);
  return spawnSync(cmd, { stdio: 'inherit', env, shell: true }).status ?? 1;
};
const results = [];
const runStarted = Date.now();

if (playwrightSuites.length) {
  // UI = tests without an @api/@a11y tag. With UI chosen, leave out the tagged suites not chosen;
  // without UI, run only the chosen tags.
  const chosenTags = playwrightSuites.filter((s) => TAGS[s]).map((s) => TAGS[s]);
  const otherTags = Object.values(TAGS).filter((t) => !chosenTags.includes(t));
  const filter = playwrightSuites.includes('ui')
    ? otherTags.length
      ? ` --grep-invert "${otherTags.join('|')}"`
      : ''
    : ` --grep "${chosenTags.join('|')}"`;
  const name = playwrightSuites.map((s) => SUITES[s].label).join(' + ');
  results.push([name, run(`npx playwright test${filter}`)]);
  if (openReport || process.env.CI) {
    run(`npx allure generate allure-results${openReport && !process.env.CI ? ' --open' : ''}`);
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
  }
}

// 5. PDF report of this run (reports/, git-ignored)
let pdf = null;
const pdfRun = spawnSync('node tools/report-pdf.mjs', {
  shell: true,
  env: { ...env, MONSTERS_URL: siteUrl, RUN_STARTED: String(runStarted), REPORT_PLAYWRIGHT: playwrightSuites.length ? '1' : '0' },
  encoding: 'utf8',
});
pdf = pdfRun.stdout?.match(/PDF report: (.+)/)?.[1]?.trim() ?? null;
if (!pdf) console.error(`
Could not create the PDF report:
${pdfRun.stderr ?? ''}`);

// 6. Summary
console.log('\n================ Summary ================');
console.log(`  Site: ${ENVS[target].label} (${siteUrl})`);
for (const [name, status] of results) console.log(`  ${status === 0 ? 'PASSED' : 'FAILED'}  ${name}`);
if (testiny) console.log('  Results uploaded to Testiny (Automation tab).');
if (pdf) console.log(`  PDF report: ${pdf}`);
console.log('=========================================\n');
process.exit(results.some(([, s]) => s !== 0) ? 1 : 0);
