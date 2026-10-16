// Interactive test runner: `npm run tests` asks which suites to run, then runs them and shows the results.
//
// Non-interactive (CI or scripts):
//   npm run tests -- --suite=ui|a11y|perf|all  (comma-separate several, e.g. --suite=ui,perf)
//                    --perf=smoke|load  --testiny  --no-report
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

try {
  process.loadEnvFile('.env');
} catch {
  // no .env
}

const SUITES = {
  ui: { label: 'UI tests', detail: 'functional tests of both sites, desktop + mobile (217 tests)' },
  a11y: { label: 'Accessibility tests', detail: 'WCAG 2.2 AA scans and keyboard checks (49 tests)' },
  perf: { label: 'Performance tests', detail: 'k6 against the live Substandard Monsters site' },
};

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
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
  console.log(`  1) ${SUITES.ui.label}  - ${SUITES.ui.detail}`);
  console.log(`  2) ${SUITES.a11y.label}  - ${SUITES.a11y.detail}`);
  console.log(`  3) ${SUITES.perf.label}  - ${SUITES.perf.detail}`);
  console.log('  4) All of them\n');
  const pick = await ask('Your choice [1-4, default 4]: ', ['1', '2', '3', '4'], '4');
  suites = { 1: ['ui'], 2: ['a11y'], 3: ['perf'], 4: ['ui', 'a11y', 'perf'] }[pick];
} else {
  suites = Object.keys(SUITES);
}
const unknown = suites.filter((s) => !SUITES[s]);
if (unknown.length) {
  console.error(`Unknown suite(s): ${unknown.join(', ')}. Use ui, a11y, perf or all.`);
  process.exit(2);
}
const playwrightSuites = suites.filter((s) => s !== 'perf');

// 2. Follow-up questions, only when relevant
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

// 3. Run
const env = {
  ...process.env,
  MONSTERS_URL: process.env.MONSTERS_URL ?? 'https://substandard-monsters.netlify.app',
  ...(testiny ? { TESTINY_UPLOAD: '1' } : {}),
};
const run = (cmd) => {
  console.log(`\n> ${cmd}\n`);
  return spawnSync(cmd, { stdio: 'inherit', env, shell: true }).status ?? 1;
};
const results = [];

if (playwrightSuites.length) {
  // UI = everything not tagged @a11y; accessibility = everything tagged @a11y.
  const filter = playwrightSuites.length === 2 ? '' : playwrightSuites[0] === 'ui' ? ' --grep-invert @a11y' : ' --grep @a11y';
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
    const status = run(`npm run -s perf:${perfType}`);
    results.push([`Performance (${perfType})`, status]);
    if (existsSync(`reports/k6-${perfType}-report.html`)) {
      console.log(`\nk6 dashboard: reports/k6-${perfType}-report.html`);
    }
  }
}

// 4. Summary
console.log('\n================ Summary ================');
for (const [name, status] of results) console.log(`  ${status === 0 ? 'PASSED' : 'FAILED'}  ${name}`);
if (testiny) console.log('  Results uploaded to Testiny (Automation tab).');
console.log('=========================================\n');
process.exit(results.some(([, s]) => s !== 0) ? 1 : 0);
