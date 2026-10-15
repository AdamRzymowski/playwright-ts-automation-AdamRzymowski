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

| Command | What it does |
| --- | --- |
| `npm test` | All projects, headless, in parallel |
| `npm run test:headed` | Same, with visible browser windows |
| `npm run test:ui` | Playwright UI mode: pick, watch, time-travel and re-run tests |
| `npm run test:debug` | Step through with the Playwright Inspector |
| `npm run test:smoke` | Only tests tagged `@smoke` |
| `npm run test:saucedemo` / `test:monsters` | One site |
| `npm run test:desktop` | Chrome + Firefox + Edge |
| `npm run test:mobile` | Mobile emulation (Pixel 7 on Chrome and Edge) |
| `npm run test:chrome` / `test:firefox` / `test:edge` | One browser |
| `npm run codegen` | Record clicks in a browser and generate test code |

Point saucedemo tests elsewhere with `BASE_URL`; Monsters tests with `MONSTERS_URL` (see `sites.ts`).

## Reports

| Command | What it does |
| --- | --- |
| `npm run allure` | Build the Allure report from the last run and open it |
| `npm run allure:generate` | Build it into `allure-report/` without opening |
| `npm run allure:open` | Serve an already built report |
| `npm run report` | Open Playwright's built-in HTML report |

The Allure report has two views: **Awesome** (tests grouped by epic / feature, with steps, screenshots,
videos, traces and attachments) and **Dashboard** (status, severity and trend charts). Each run starts
with empty `allure-results/`; run history is kept in `allure-history/`, so trend charts grow with every
report you generate.

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
