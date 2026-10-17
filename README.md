# Playwright TypeScript Automation

Example web automation project with [Playwright](https://playwright.dev) and TypeScript. It tests two
sites on Chrome, Firefox and Edge in parallel, plus a mobile view, and draws results in an
[Allure](https://allurereport.org) dashboard:

- **saucedemo** - the public demo shop [saucedemo.com](https://www.saucedemo.com)
- **monsters** - the Substandard Monsters 3D-printing website, served from a local checkout of
  [substandard-monsters](https://github.com/AdamRzymowski/substandard-monsters) at `../Substandard-Monsters`

## Substandard Monsters tests

Playwright starts a small local web server for the `../Substandard-Monsters` folder, so the tests
check whatever branch is checked out there. To use another folder set `MONSTERS_DIR`, or set
`MONSTERS_URL` to test a deployed copy instead.

The request form is never really sent: every call to FormSubmit is blocked or mocked
(`fixtures/monsters.ts`), so test runs don't email you.

| Command | What it does |
| --- | --- |
| `npm run test:monsters` | Monsters tests against the local `../Substandard-Monsters` folder |
| `npm run test:monsters:live` | Monsters tests against https://substandard-monsters.netlify.app |
| `npm run test:monsters:submit` | **Sends one real request email** through the live form (Chromium only), to check the whole chain works end to end |

The real-submission test (`tests/monsters/e2e/real-submit.spec.ts`) is skipped unless `SUBMIT_REAL_FORM=1`
is set. Its data is marked `[AUTOMATED TEST - please ignore]`. It checks the request the browser sent,
the backend's response (status, headers, exact JSON body) and the page's success state.

### API tests (request form backend)

`tests/monsters/api/` tests FormSubmit, the service behind the request form, with plain HTTP calls and no
browser (Playwright project `api`, tag `@api`, its own *API tests* view in the Allure report):

| Group | Checks | Sends email? |
| --- | --- | --- |
| Contract | EN/PL forms POST to the FormSubmit AJAX endpoint, with the expected hidden fields (`_subject`, `_template`, `_captcha`, `Language`, empty `_honey`) and all field names | No |
| Endpoint | GET is rejected with `405` + JSON; the CORS preflight lets the site POST with an `Accept` header | No |
| Successful submission | A complete request returns `200`, JSON, CORS header, within 10 s, and exactly `{"success":"true","message":"The form was submitted successfully."}` | **Yes, 1 email** (opt-in) |

`npm run test:api` runs them (the email test is skipped); `npm run test:api:submit` includes the real
submission against the live site.

Accessibility: `tests/monsters/*/accessibility.spec.ts` (tagged `@a11y`) scan each page state with
[axe-core](https://github.com/dequelabs/axe-core) against WCAG 2.0/2.1/2.2 level A and AA, and add keyboard,
screen-reader label, focus, zoom and touch-target checks. Each scan attaches a readable summary to the
Allure report. Run them with `npm run test:a11y`.

Covered: page structure and nav, every image loads, no JavaScript errors, gallery tabs and Painting
sub-tabs, service cards and `#gallery-...` links, lightbox, form success / validation / errors, the
EN/PL switch and translations, EN/PL content staying in sync, and the mobile menu and layout.

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

  1) UI tests  - functional browser tests of both sites, desktop + mobile
  2) API tests  - request form backend (FormSubmit), no browser
  3) Accessibility tests  - WCAG 2.2 AA scans and keyboard checks
  4) Performance tests  - k6 against the live Substandard Monsters site
  5) All of them

Your choice [1-5, default 5]:
```

then the follow-ups that apply: k6 smoke or load, upload to Testiny (only if `.env` has a key), and
whether to open the Allure report. It ends with a PASSED/FAILED summary per suite. Monsters tests run
against the live site.

**Skip the questions** by naming the suites (handy for CI, or to repeat a run):

| Command | Runs |
| --- | --- |
| `npm run tests -- --suite=ui` | UI tests |
| `npm run tests -- --suite=api` | API tests |
| `npm run tests -- --suite=a11y` | Accessibility tests |
| `npm run tests -- --suite=perf --perf=smoke` | k6 smoke test (`--perf=load` for the load test) |
| `npm run tests -- --suite=all` | Everything |
| `npm run tests -- --suite=ui,a11y --no-report` | Several suites, without opening the report |

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
| `npm run test:saucedemo` / `test:monsters` | One site |
| `npm run test:desktop` | Chrome + Firefox + Edge |
| `npm run test:mobile` | Mobile emulation (Pixel 7 on Chrome and Edge) |
| `npm run test:chrome` / `test:firefox` / `test:edge` | One browser |
| `npm run codegen` | Record clicks in a browser and generate test code |

Point saucedemo tests elsewhere with `BASE_URL`; Monsters tests with `MONSTERS_URL` (see `sites.ts`).

## Reports

| Command | What it does |
| --- | --- |
| `npm run report:full` | Run everything (Monsters on the live site) with a screenshot + video of every test, then build and open the Allure report |
| `npm run allure` | Build the Allure report from the last run and open it |
| `npm run allure:generate` | Build it into `allure-report/` without opening |
| `npm run allure:open` | Serve an already built report |
| `npm run report` | Open Playwright's built-in HTML report |

The Allure report opens on a start page with four views (set up in `allurerc.mjs`): **All tests**,
**Desktop tests** and **Mobile tests** (lists grouped by platform / epic / feature, with steps, screenshots,
videos, traces and attachments) and **Charts** (status, severity and trend charts). Every test is labelled
Desktop or Mobile by `fixtures/base.ts`. Each run starts
with empty `allure-results/`; run history is kept in `allure-history/`, so trend charts grow with every
report you generate.

## Performance tests (k6)

[k6](https://grafana.com/docs/k6/latest/) scripts in `perf/` load the Substandard Monsters site the way a
visitor does: the English page with its CSS, JS and photos, then the Polish page. They only read pages and
never send the request form. Install k6 once (`winget install k6 --source winget`), then:

| Command | What it does |
| --- | --- |
| `npm run perf:smoke` | 1 visitor for 30 s: is the site up, correct and fast? |
| `npm run perf:load` | Ramps up to 10 visitors at once over ~2.5 min |

Pass/fail rules (`thresholds` in `perf/lib/monsters.ts`): under 1% failed requests, every content check
passing, 95% of HTML pages within 1 s and 95% of CSS/JS/photos within 2 s (1.5 s / 3 s under load), and
HTML time-to-first-byte within 600 ms (800 ms under load). Photo download times depend on your own
internet connection, which is why they have a separate, looser limit. k6 exits with an error when a rule is broken.

Results: a summary in the console, plus `reports/k6-<test>-report.html` (graphs you can open in a
browser) and `reports/k6-<test>-summary.txt|json`. Point at another copy with
`k6 run -e MONSTERS_URL=https://... perf/smoke.ts`. Keep the load small: the site runs on Netlify's free plan.

## Test management (Testiny)

Results can be uploaded to [Testiny](https://www.testiny.io) (free plan: up to 3 users). The first upload
creates a test case for each test; every upload after that adds a test run with pass/fail, errors and
attachments (screenshots, videos).

1. In Testiny, create a project and an API key (Settings > API keys).
2. Copy `.env.example` to `.env` and fill in `TESTINY_API_KEY` and `TESTINY_PROJECT`.
   `.env` is git-ignored, so the key never reaches GitHub.
3. Run `npm run test:testiny` (all tests, Monsters on the live site, results uploaded).

Normal runs (`npm test` etc.) don't upload anything. Each test's Desktop / Mobile label is sent as a
`platform` field.

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
pages/<site>/            Page objects: one class per page, holding its locators and actions
fixtures/<site>.ts       Extended `test` per site (page objects, login, email blocking)
tests/<site>/e2e/        Desktop specs (run on chromium, firefox, edge)
tests/<site>/mobile/     Mobile specs (run on mobile-chrome, mobile-edge)
tests/utils/testData.ts  Demo users, product names, Faker data builders
```

## Writing a test

```ts
import * as allure from 'allure-js-commons';
import { test, expect } from '../../../fixtures/saucedemo';

test('my test', { tag: ['@smoke'] }, async ({ loggedIn, cartPage }) => {
  await allure.feature('Cart');
  await loggedIn.addToCart('Sauce Labs Backpack');
  await loggedIn.openCart();
  await expect(cartPage.itemNames).toHaveText(['Sauce Labs Backpack']);
});
```

- Put a spec in `tests/<site>/e2e/` to run it on desktop browsers, or `tests/<site>/mobile/` for mobile.
- Use `expect.soft(...)` to check many things and report every failure, not just the first.
- Use `test.step(...)` to break a test into named steps; they show up in both reports.
