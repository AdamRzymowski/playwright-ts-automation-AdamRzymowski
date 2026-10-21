# Playwright TypeScript Automation

Test automation for the **Substandard Monsters** 3D-printing website (https://substandard-monsters.com,
repo [substandard-monsters](https://github.com/AdamRzymowski/substandard-monsters)) with
[Playwright](https://playwright.dev) and TypeScript. It runs on Chrome, Firefox and Edge at desktop and phone
size, checks accessibility (WCAG 2.2 AA) and performance (k6), and
draws results in an [Allure](https://allurereport.org) dashboard and a PDF.

## Substandard Monsters tests

### Environments: live, dev, local

The same tests can run against three copies of the site (addresses in `sites.ts`, overridable in `.env`):

| Environment | Variable (default address) | What it is |
| --- | --- | --- |
| `live` | `MONSTERS_LIVE_URL` (https://substandard-monsters.com) | The published site (`main` branch) |
| `dev` | `MONSTERS_DEV_URL` (https://dev--substandard-monsters.netlify.app) | Netlify's preview of the `dev` branch, to test changes **before** publishing |
| `local` | `MONSTERS_LOCAL_URL` (http://localhost:4173) | The `../Substandard-Monsters` folder on this PC (whatever branch is checked out); Playwright starts a small web server for it |

`npm run tests` asks which one to use (or `--env=live|dev|local`). Plain Playwright runs use
`MONSTERS_ENV` (default `local`): `npm run test:monsters:live`, `test:monsters:dev`, `test:monsters:local`.
`MONSTERS_URL` overrides everything with any address.

The live site is on its own domain, but Netlify still names the dev and pull request previews after the
Netlify *site name* (`dev--<site name>.netlify.app`, `deploy-preview-12--<site name>.netlify.app`). That
name defaults to `substandard-monsters`; if it's different (Netlify: Site configuration > Site details >
Site name), set `MONSTERS_NETLIFY_SITE` in `.env`.
The runner checks that a deployed copy answers before testing it.

**Before / after publishing:**

| When | Command | Tests |
| --- | --- | --- |
| Before publishing, a pull request | `npm run test:preview -- 12` | Netlify's temporary deploy preview of pull request #12 (`https://deploy-preview-12--substandard-monsters.netlify.app`); a full preview address works too |
| Before publishing, the `dev` branch | `npm run test:dev` | The dev branch preview |
| After publishing | `npm run test:live` | The published site |

Each asks which suites to run (add `--suite=ui,a11y` etc. to skip the question). In VS Code, the tasks
*Tests: pull request preview* (asks for the number) and *Tests: live site* do the same.
A typical flow: open a pull request from `dev` into `main`, run `test:preview` on it, merge when green,
then run `test:live`.

The dev preview needs Netlify *branch deploys* switched on for `dev` (Site configuration > Build & deploy >
Branches and deploy contexts > Branch deploys > add `dev`), and the site connected to the GitHub repo.

The request form is never really sent: every call to FormSubmit is blocked or mocked
(`fixtures/monsters.ts`), so test runs don't email you.

| Command | What it does |
| --- | --- |
| `npm run test:monsters` | Monsters tests against the local `../Substandard-Monsters` folder |
| `npm run test:monsters:live` | Monsters tests against https://substandard-monsters.com |
| `npm run test:monsters:submit` | **Sends one real request email** through the live form (Chromium only), to check the whole chain works end to end |

The real-submission test (`tests/monsters/e2e/real-submit.spec.ts`) is skipped unless `SUBMIT_REAL_FORM=1`
is set. Its data is marked `[AUTOMATED TEST - please ignore]`. It checks the request the browser sent,
the backend's response (status, headers, exact JSON body) and the page's success state.

Accessibility: `tests/monsters/*/accessibility.spec.ts` (tagged `@a11y`) scan each page state with
[axe-core](https://github.com/dequelabs/axe-core) against WCAG 2.0/2.1/2.2 level A and AA, and add keyboard,
screen-reader label, focus, zoom and touch-target checks. Each scan attaches a readable summary to the
Allure report. Run them with `npm run test:a11y`.

Covered: page structure and nav, every image loads, no JavaScript errors, gallery tabs and Painting
sub-tabs, service cards and `#gallery-...` links, lightbox, form success / validation / errors, the
EN/PL switch and translations, EN/PL content staying in sync, the mobile menu and layout, form
character limits and the quantity range (`form-limits.spec.ts`), text colour contrast on every page state
(`contrast.spec.ts`), and the file link format (`file-link.spec.ts`), the success pop-up (`success-dialog.spec.ts`) and the SQL guard (`sql-guard.spec.ts`).

## Setup

```bash
npm install
npx playwright install
```

Edge runs the Microsoft Edge installed on your machine (`channel: 'msedge'`). Playwright drives the
browsers directly, so no chromedriver, geckodriver or msedgedriver is needed.

## Running tests

### Quick start (VS Code)

Open a terminal in VS Code (**Terminal > New Terminal**, or `` Ctrl+` ``) in the project folder and run:

```bash
npm run tests
```

It asks what to run:

```
Which tests do you want to run?

  1) UI tests  - functional browser tests of the site, desktop + mobile
  2) Accessibility tests  - WCAG 2.2 AA scans and keyboard checks
  3) Performance tests  - k6 against the live Substandard Monsters site
  4) All of them

Your choice [1-4, default 4]:
```

then which site (live, dev, local or a pull request preview) and which **browsers** (desktop Chrome /
Firefox / Edge, mobile, both, or BrowserStack Mac), then the follow-ups that apply: k6 smoke, load or soak, upload to Testiny (only if `.env` has a key), and
whether to open the Allure report (it is always built after a Playwright run). It ends with a PASSED/FAILED summary per suite. Monsters tests run
against the live site.

**Skip the questions** by naming the suites (handy for CI, or to repeat a run):

| Command | Runs |
| --- | --- |
| `npm run tests -- --suite=ui` | UI tests |
| `npm run tests -- --suite=ui --browsers=desktop` | UI tests on Chrome, Firefox and Edge only (`mobile`, `browserstack`, `all` also work) |
| `npm run test:desktop-ui` | Same, against the live site |
| `npm run test:browserstack` | UI tests on Safari and Chrome on a Mac (BrowserStack), against the live site |
| `npm run tests -- --suite=a11y` | Accessibility tests |
| `npm run tests -- --suite=ui --exclude="enough contrast"` | UI tests without the tests whose title matches (e.g. known failures) |
| `npm run tests -- --suite=perf --perf=smoke` | k6 smoke test (`--perf=load` for the load test, `--perf=soak` for the 15-minute soak test) |
| `npm run tests -- --suite=all` | Everything |
| `npm run tests -- --suite=ui,a11y --no-report` | Several suites; the Allure report is still built, just not opened |

**One run per browser.** When several browsers are chosen, the runner tests them one after another, each as
its own complete run (Chrome, then Firefox, then Edge, ...), with its own Allure report
(`allure-report/by-browser/<browser>/`, plus a start page linking them all) and its own PDF
(`reports/test-report-<date>_<time>-<browser>.pdf`). The summary shows PASSED/FAILED per browser.
Add `--together` to run all browsers in one combined run with a single report instead.

**Watch the browser.** Answer *yes* to "Show the browser windows while testing?" (or add `--headed`) to see
the tests click through the site. Headed runs go one test at a time so the window is watchable; add
`--workers=4` to speed them up.

**Desktop and mobile view on every browser.** A UI run tests each browser twice: at desktop size, and at
phone size (Pixel 7, 412 x 915, touch). The phone-size runs (`mobile-chrome`, `mobile-firefox`,
`mobile-edge`) repeat **every** desktop test plus the phone-only layout tests, so both layouts are checked
on Chrome, Firefox and Edge. Firefox has no full mobile emulation, so it runs at phone size with touch and a
mobile user agent.

Add `--testiny` to upload the Playwright results to Testiny.

**Without typing:** **Terminal > Run Task...** (or `Ctrl+Shift+P` > *Tasks: Run Task*) lists ready-made
tasks from `.vscode/tasks.json`: *Tests: choose what to run*, *Tests: UI only*, *Tests: accessibility
only*, *Tests: performance smoke / load (k6)*, *Tests: all suites* and *Report: open Allure report*.
*Tests: choose what to run* is the default test task, so `Ctrl+Shift+P` > *Tasks: Run Test Task* starts it
directly (you can bind a keyboard shortcut to that command).

### Playwright commands

Or run Playwright directly:

| Command | What it does |
| --- | --- |
| `npm test` | All projects, headless, in parallel |
| `npm run test:headed` | Same, with visible browser windows |
| `npm run test:ui` | Playwright UI mode: pick, watch, time-travel and re-run tests |
| `npm run test:debug` | Step through with the Playwright Inspector |
| `npm run test:smoke` | Only tests tagged `@smoke` |
| `npm run test:ui-only` | UI tests only (everything not tagged `@a11y`) |
| `npm run test:a11y` | Accessibility tests only (tagged `@a11y`) |
| `npm run test:desktop` | Chrome + Firefox + Edge |
| `npm run test:mobile` | Mobile emulation (Pixel 7 on Chrome and Edge) |
| `npm run test:chrome` / `test:firefox` / `test:edge` | One browser |
| `npm run codegen` | Record clicks in a browser and generate test code |

Point the tests at another copy of the site with `MONSTERS_ENV` / `MONSTERS_URL` (see `sites.ts`).

## Reports

| Command | What it does |
| --- | --- |
| `npm run report:full` | Run everything (Monsters on the live site) with a screenshot + video of every test, then build and open the Allure report |
| `npm run allure` | Build the Allure report from the last run and open it |
| `npm run allure:generate` | Build it into `allure-report/` without opening |
| `npm run allure:open` | Serve an already built report |
| `npm run allure:browsers` | Open the per-browser Allure reports (start page linking each browser's report) |
| `npm run report` | Open Playwright's built-in HTML report |

The Allure report opens on a start page with four views (set up in `allurerc.mjs`): **All tests**,
**Desktop tests** and **Mobile tests** (lists grouped by platform / epic / feature, with steps, screenshots,
videos, traces and attachments) and **Charts** (status, severity and trend charts). Every test is labelled
Desktop or Mobile by `fixtures/base.ts`. Each run starts
with empty `allure-results/`; run history is kept in `allure-history/`, so trend charts grow with every
report you generate.

## Adding tests and screenshots

- **Adding a test:** Claude follows the `test-creation-template` skill (`.claude/skills/`), required by
  CLAUDE.md: placement, a brief self-describing title, the code template, running it on every browser, the
  matching manual case and any known issue.
- **Titles:** every test is named with a short sentence saying what it checks, e.g. "Quantity 0 is rejected".
- **Proof screenshots:** every assertion attaches a screenshot to the report, "✓ passed: …" or "✗ failed: …"
  with what was checked, plus one after each named step and one at the end of each test. They're visible-
  screen JPEGs to keep reports manageable; set `ASSERT_SCREENSHOTS=0` to skip the per-assertion ones for a quick
  run.

## Known issues

[KNOWN-ISSUES.md](KNOWN-ISSUES.md) lists the bugs found in the Substandard Monsters site (character limits,
unreadable dropdown after a failed check, link format, contrast and keyboard access), with steps to
reproduce, expected vs actual, possible fixes and the tests that cover each one.

## Manual test cases

`Manual tests/` holds a manual test case for every automated UI test (148 cases, desktop and mobile), for
testing by hand or importing into a test management tool. MT-067 to MT-079 were the removed demo-shop
cases; their numbers are kept unused so the other case numbers don't change.

| File | What it is |
| --- | --- |
| `manual-test-cases.pdf` | Printable: contents page, then one card per case |
| `manual-test-cases.csv` | Spreadsheet / Testiny import: one row per step (steps delimiter **rows**, folder delimiter **>**) |
| `manual-test-cases.mjs` | The source: edit cases here |

Each case has a number (`MT-001`...), title, site and area, **platform** (desktop browsers, phone or tablet
size), **version** (the site version it was written for, plus the test case version), priority,
preconditions, numbered steps with expected results, and the automated test it mirrors.

After editing the source or the UI tests, run `npm run manual:build`. It rebuilds the CSV and PDF and checks
that every automated UI test still has exactly one manual case (and points out any that don't). Each case
points to its test by file and title (`auto: 'monsters/e2e/home.spec.ts › footer shows the site version'`;
add the describe name when a title repeats), so it keeps working when test files change. New cases go at
the end so existing case numbers (MT-001…) stay the same.

## BrowserStack: Safari and Chrome on a Mac

For compatibility beyond this Windows PC, the desktop UI tests can run on real Macs in
[BrowserStack](https://www.browserstack.com/automate/playwright)'s cloud: **Safari** (Playwright WebKit) and
**Chrome** on macOS.

1. In BrowserStack, open *Account > Access keys* and copy your username and access key.
2. Put them in `.env` as `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` (never commit them).
3. Run `npm run test:browserstack`, or pick *BrowserStack* at the browsers question of `npm run tests`.

The projects `bs-mac-safari` and `bs-mac-chrome` (in `playwright.config.ts`) only exist when the keys are
set. Each run appears in the BrowserStack Automate dashboard under the build name (with video and logs),
and in the Allure and PDF reports like any other browser. BrowserStack can't open this PC's local site, so
use live, dev or a preview. Optional: `BROWSERSTACK_MAC_OS` (default Sonoma), `BROWSERSTACK_BUILD_NAME`.
BrowserStack needs to support the Playwright version in `package.json`; if a run fails to connect with a
version error, check their supported versions.

## Where test results go

Results never go into the git repository. Every output folder is in `.gitignore`, so GitHub only holds
the test code.

| Output | Where | How |
| --- | --- | --- |
| Allure report (interactive) | `allure-report/` on your PC, history in `allure-history/` | `npm run allure` / `npm run allure:open` |
| **PDF report** | `reports/test-report-<date>_<time>.pdf` on your PC | Created automatically by `npm run tests`; or `npm run report:pdf` after any run |
| Screenshots | Inside the Allure and Playwright reports (`test-results/` while running) | **Every test, passed or failed**: a full-page screenshot at the end, plus an "after step" screenshot after each named `test.step()` |
| Videos, traces | Same | Kept for failed tests; `npm run report:full` keeps every video |
| Testiny | Testiny cloud, Automation tab | Answer *yes* to the Testiny question in `npm run tests`, or `npm run test:testiny` |
| k6 dashboards | `reports/k6-<test>-report.html` | `npm run perf:smoke` / `perf:load` / `perf:soak` |

The PDF covers only the run that just finished:
- **Run details**: site and app version, test-code commit, machine, Node, Playwright and exact browser versions
- **Totals** and pass bar; **by browser/device** (pass rate, time); **by feature and browser** grid; **by severity**
- **Failures**: where (file:line), severity, which browsers failed/passed, the failing step, the error with
  expected/received, and a screenshot
- **Skipped tests** with the reason, the **slowest tests**, k6 thresholds and timings when performance ran
- **All tests** grid: result per browser with its duration

## Performance tests (k6)

[k6](https://grafana.com/docs/k6/latest/) scripts in `perf/` load the Substandard Monsters site the way a
visitor does: the English page with its CSS, JS and photos, then the Polish page. They only read pages and
never send the request form. Install k6 once (`winget install k6 --source winget`), then:

| Command | What it does |
| --- | --- |
| `npm run perf:smoke` | 1 visitor for 30 s: is the site up, correct and fast? |
| `npm run perf:load` | Ramps up to 10 visitors at once over ~2.5 min |
| `npm run perf:soak` | **Soak test:** 15 visitors click around the site in real headless Chrome for 15 minutes |

**Soak test** (`perf/soak.ts`, k6 browser): each of the 15 visitors repeats one round for 15 minutes:
1. Open the home page.
2. Click "Gallery".
3. Click every gallery tab and the Miniatures / Terrain sub-tabs, in random order.
4. Open a random photo and close it with Escape.
5. Click two random menu links.
6. Sometimes switch to Polish.

Each visitor waits 1–3 s between clicks, like a person looking at the page. It checks that the site stays
fast and working over a long session:
- every click does what it should (99% of checks);
- Core Web Vitals stay "good" (LCP under 2.5 s, CLS under 0.1, for 75% of page loads);
- a gallery tab switches within 0.5 s and a photo opens, full-size, within 3 s (95% of the time).

Only our own site is loaded. `npm run perf:soak` blocks Google Fonts with `K6_BROWSER_ARGS`, and every visit
checks that nothing came from another site; if something did, the test stops. The test starts 15 Chrome
windows (about 3–5 GB of memory). For a short try: `npm run perf:soak -- -e SOAK_USERS=2 -e SOAK_DURATION=1m`.

Pass/fail rules (`thresholds` in `perf/lib/monsters.ts`): under 1% failed requests, every content check
passing, 95% of HTML pages within 1 s and 95% of CSS/JS/photos within 2 s (1.5 s / 3 s under load), and
HTML time-to-first-byte within 600 ms (800 ms under load). Photo download times depend on your own
internet connection, which is why they have a separate, looser limit. k6 exits with an error when a rule is broken.

Results: a summary in the console, plus `reports/k6-<test>-report.html` (graphs you can open in a
browser) and `reports/k6-<test>-summary.txt|json`. Point at another copy with
`k6 run -e MONSTERS_URL=https://... perf/smoke.ts`; `npm run tests` passes the chosen environment for you
(and starts the local web server when you pick `local`). Keep the load small: the site runs on Netlify's free plan.

## Test management (Testiny)

Results can be uploaded to [Testiny](https://www.testiny.io) (free plan: up to 3 users). The first upload
creates a test case for each test; every upload after that adds a test run with pass/fail, errors and
attachments (screenshots, videos).

1. In Testiny, create a project and an API key (Settings > API keys).
2. Copy `.env.example` to `.env` and fill in `TESTINY_API_KEY` and `TESTINY_PROJECT`.
   `.env` is git-ignored, so the key never reaches GitHub.
3. Run `npm run test:testiny` (all tests, Monsters on the live site, results uploaded).

**Every run against the live site uploads automatically** (`npm run tests` with Live, `npm run test:live`,
`npm run test:testiny`); runs against dev, local or a preview upload only with `--testiny` or a "y" to the
question. Plain `npx playwright test` doesn't upload. Each test's Desktop / Mobile label is sent as a
`platform` field.

**Run names** follow `<DD.MM.YY>-<environment>-<attempt>`, e.g. `20.10.26-live-2` for the second live run on
20 October 2026. The attempt is counted on this PC (`reports/testiny-runs.json`). When the runner tests
browsers one after another, they all report into that one Testiny run; the last browser closes it.

Uploaded results appear under Testiny's **Automation** tab. To also list the tests under **Test cases**
(for test plans and manual runs), run the suite, then `npm run export:testiny`. That writes
`reports/testiny-test-cases.csv` (folders `Desktop|Mobile > site > feature > story`, priority from the
Allure severity, steps from `test.step(...)` blocks). Import it in Testiny under Test cases > Import with
the steps delimiter set to **rows** and the folder delimiter **>**.

## Project layout

```
playwright.config.ts     Browser projects, reporters, local web server
sites.ts                 URLs of the sites under test
global-setup.ts          Clears old Allure results before each run
allurerc.mjs             Allure report settings (name, plugins, history)
tools/serve-static.mjs   Tiny static server for the local Monsters site
pages/monsters/          Page object: the site's locators, texts (EN/PL) and actions
fixtures/monsters.ts     Extended `test` (page objects, FormSubmit blocking, step screenshots)
tests/monsters/e2e/      Desktop specs (also run in phone view on every browser)
tests/monsters/mobile/   Phone-only layout specs (mobile-chrome, mobile-firefox, mobile-edge)
tests/utils/             Faker data builders, multipart parser, accessibility helper
```

## Writing a test

```ts
import * as allure from 'allure-js-commons';
import { test, expect } from '../../../fixtures/monsters';

test('Facebook button is in the contact section', { tag: ['@smoke'] }, async ({ site }) => {
  await allure.epic('Substandard Monsters');
  await allure.feature('Facebook');
  await site.goto('#contact');
  await expect(site.contactFacebook).toBeVisible();
});
```

- Put a spec in `tests/monsters/e2e/` to run it at desktop and phone size, or `tests/monsters/mobile/` for
  phone-only layout checks.
- Use `expect.soft(...)` to check many things and report every failure, not just the first.
- Use `test.step(...)` to break a test into named steps; they show up in both reports.
