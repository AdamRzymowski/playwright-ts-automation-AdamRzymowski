# Playwright TypeScript Automation

Automated tests for the **Substandard Monsters** website (https://substandard-monsters.com; site repo
`../Substandard-Monsters`, branches `dev` → `main`, published by Netlify) with Playwright + TypeScript.
Reports: Allure, PDF (`reports/`), optional Testiny. See README.md for every command and the folder layout,
and KNOWN-ISSUES.md for open site bugs.

## Adding tests (always)
- **Every time the user asks to add a new test (or tests, checks, test cases), use the
  `test-creation-template` skill** (`.claude/skills/test-creation-template/SKILL.md`) and follow all its steps:
  place, title, template, run, manual case, known issues.
- Test titles are a brief, self-contained description of what is checked (e.g. "Quantity 0 is rejected").

## Accessibility (always)
- **Check every change against the `wcag-check` skill** (`.claude/skills/wcag-check/SKILL.md`, WCAG 2.2 AA)
  before committing. That covers changes to the site (`../Substandard-Monsters`), tests that touch page
  behaviour, and pages or reports this project generates.
- Report which criteria the change touches and the result of each. Log site failures in KNOWN-ISSUES.md with
  the WCAG criterion number.
- Running the accessibility tests against a site still follows "Ask before running".

## Ask before running anything outside this repo (always)
- **Ask the owner every time before executing anything that this git project doesn't own**, and wait for a yes.
  That includes:
  - test runs against the live, dev or preview site, and which suites to run;
  - performance tests (k6 smoke, load, soak);
  - real form submissions;
  - BrowserStack;
  - Testiny uploads outside the live-run rule below;
  - commands in the site repo `../Substandard-Monsters`;
  - installing or updating tools and packages;
  - git push.
- A yes covers that one run, not later ones.
- No need to ask for work inside this repo:
  - editing files;
  - `npx playwright test --list --reporter=list`;
  - `npm run manual:build`;
  - checking a k6 script without running it (`k6 inspect`);
  - local commits.

## Testiny (always)
- **Every run against the live site uploads its results to Testiny.** `npm run tests` does this automatically
  for `--env=live` (and `npm run test:testiny`); never start a live run with results kept local only.
  Other sites (dev, local, preview) upload only with `--testiny` or when the owner says so.
- **Testiny run names: `<DD.MM.YY>-<environment>-<attempt>`**, e.g. `20.10.26-live-2`: day, month and last two
  digits of the year, then the environment (live / dev / local / preview), then the attempt number for that
  date and environment (1, 2, 3…). The runner builds the name (counter in `reports/testiny-runs.json`) and
  puts all browsers of one session into that single Testiny run.

## Testing boundaries (always applies)
- Never test third-party APIs, services or databases (e.g. FormSubmit, Facebook, Netlify, BrowserStack) beyond normal use of the site as a regular visitor would use it, unless the owner gives explicit permission for that specific test.
- No security probing of third parties: no SQL/script injection aimed at their servers, no load, flood or DDoS-style traffic, no fuzzing their endpoints, no bypassing their protections.
- Security tests target only our own site, with third-party calls mocked (e.g. `page.route` for FormSubmit). Injection strings may be typed into our form only when the request is mocked and never reaches the third party.
- Performance tests (k6) only hit our own site, at the small loads in `perf/`, never third-party endpoints.
- Real form submissions (they email the owner) are opt-in and need the owner's go-ahead each time.

## Commands
- `npm run tests` — interactive runner: suites (UI / accessibility / performance), site (live / dev /
  local / PR preview), browsers (desktop, phone view, BrowserStack), headed or not. Flags skip the questions:
  `npm run tests -- --suite=ui --env=live --browsers=desktop,mobile --no-report`
- `npx playwright test <file> -g "<title>" --project=chromium` — fastest check of one test
- `MONSTERS_ENV=live|dev|local` picks the site for plain `npx playwright test` (default local)
- `npm run manual:build` — rebuild manual test cases (CSV + PDF) and check every UI test has one
- `npm run allure:browsers` — open the per-browser Allure reports after a runner run
- Before any automated run, ask the owner which suites to run (UI / accessibility / performance / all) unless
  they already said.

## Conventions
- Specs import `test` and `expect` from `fixtures/monsters.ts`,
  never from `@playwright/test`: that `expect` screenshots every assertion (✓ passed / ✗ failed) and the
  fixtures add step screenshots, Desktop/Mobile labels and FormSubmit blocking.
- Locators and EN/PL texts live in `pages/monsters/MonstersPage.ts`; the site uses `data-testid`
  (`getByTestId`). No CSS/XPath in specs.
- `tests/monsters/e2e/` runs at desktop and phone size on Chrome, Firefox and Edge; `tests/monsters/mobile/`
  only at phone size. Tags: `@a11y`, `@security`, `@smoke`.
- Every spec sets `allure.epic('Substandard Monsters')` and `allure.feature(...)` in `beforeEach`; key tests set
  `allure.severity`. Use `expect.soft` for several independent checks and `test.step` for phases.
- Test data comes from `tests/utils/testData.ts` (Faker). Form test email: `TEST_EMAIL`
  (adamrzymowski@gmail.com); real-submission sender: `REAL_SUBMIT_EMAIL` (wredny@gmail.com, `SUBMIT_EMAIL`
  overrides).
- Every UI test has exactly one manual case in `Manual tests/manual-test-cases.mjs`, linked by
  `auto: '<file> › <title>'`. New cases go at the end (case numbers come from position; removed ones stay
  as `RETIRED`).

## Gotchas
- `--reporter=...` on the command line replaces the configured reporters, so no Allure results are written.
- `npx playwright test --list` with the default reporters overwrites `allure-results/`; use `--reporter=list`.
- Each run starts by clearing `allure-results/` (global-setup.ts).
- Firefox can't fully emulate a phone; `mobile-firefox` is phone size + touch, `navigator.maxTouchPoints` is 0.
- The site scrolls smoothly; scroll with `behavior: 'instant'` before tapping, or taps land mid-animation.
- FormSubmit can take over 30 s to confirm a real submission (KNOWN-ISSUES KI-012).
- The `edge` projects need Microsoft Edge installed locally (`channel: 'msedge'`).

## Git
- Test project: commit to `main`; ask before pushing. Site repo: work on `dev`, merge to `main` to publish;
  ask before pushing either.
- Test results (allure-*, reports/, test-results/) and `.env` are git-ignored and never committed.
