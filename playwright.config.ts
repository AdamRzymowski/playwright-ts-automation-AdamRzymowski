import './env';
import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { MONSTERS_DIR, MONSTERS_ENV, MONSTERS_IS_LOCAL, MONSTERS_PORT, MONSTERS_URL } from './sites';
import { nextRunName } from './testiny';

/**
 * Site under test (URLs in sites.ts): the Substandard Monsters website, tests in tests/monsters/.
 * MONSTERS_ENV=live | dev | local (default local, the ../Substandard-Monsters folder);
 * MONSTERS_URL overrides with any address.
 *
 * Browsers run side by side: every desktop spec runs once per desktop project, every
 * mobile spec once per mobile project, spread across parallel workers.
 * Playwright drives its own browsers, so no chromedriver/geckodriver/msedgedriver is needed.
 *
 * See https://playwright.dev/docs/test-configuration.
 */
const DESKTOP_SPECS = /[\\/]e2e[\\/].*\.spec\.ts$/;
const MOBILE_SPECS = /[\\/]mobile[\\/].*\.spec\.ts$/;

/*
 * BrowserStack: real Macs in the cloud for Safari (WebKit) and Chrome compatibility runs.
 * Only added when BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY are set (e.g. in .env).
 * Cloud browsers can't reach this PC's local site, so use MONSTERS_ENV=live/dev or a preview.
 * Docs: https://www.browserstack.com/docs/automate/playwright/playwright-capabilities
 */
const BS_USER = process.env.BROWSERSTACK_USERNAME;
const BS_KEY = process.env.BROWSERSTACK_ACCESS_KEY;
const BS_BUILD = process.env.BROWSERSTACK_BUILD_NAME ?? `Playwright TS Automation ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
// eslint-disable-next-line @typescript-eslint/no-require-imports -- package.json is not an ES module export
const PW_VERSION: string = require('@playwright/test/package.json').version;
function browserstack(browser: 'playwright-webkit' | 'chrome') {
  const caps = {
    browser,
    os: 'osx',
    os_version: process.env.BROWSERSTACK_MAC_OS ?? 'Sonoma',
    ...(browser === 'chrome' ? { browser_version: 'latest' } : {}),
    project: 'Playwright TS Automation',
    build: BS_BUILD,
    name: `Mac ${browser === 'chrome' ? 'Chrome' : 'Safari'}`,
    'browserstack.username': BS_USER,
    'browserstack.accessKey': BS_KEY,
    'client.playwrightVersion': PW_VERSION,
  };
  return { wsEndpoint: `wss://cdp.browserstack.com/playwright?caps=${encodeURIComponent(JSON.stringify(caps))}` };
}
const browserstackProjects =
  BS_USER && BS_KEY
    ? [
        {
          name: 'bs-mac-safari',
          testMatch: DESKTOP_SPECS,
          timeout: 90_000,
          use: { ...devices['Desktop Safari'], browserName: 'webkit' as const, connectOptions: browserstack('playwright-webkit') },
        },
        {
          name: 'bs-mac-chrome',
          testMatch: DESKTOP_SPECS,
          timeout: 90_000,
          use: { ...devices['Desktop Chrome'], browserName: 'chromium' as const, connectOptions: browserstack('chrome') },
        },
      ]
    : [];

/*
 * Testiny (test management): uploads test cases and a test run when TESTINY_UPLOAD=1. `npm run tests` turns
 * this on for every run against the live site. Needs TESTINY_API_KEY and TESTINY_PROJECT in .env.
 * Run name: <DD.MM.YY>-<environment>-<attempt>, e.g. "20.10.26-live-2" (see testiny.ts). The runner passes
 * TESTINY_RUN_NAME so all browsers of one session land in one Testiny run; TESTINY_COMPLETE_RUN=0 keeps the
 * run open for the next browser, and the last one closes it.
 */
// Workers re-read this config; keep the name in the environment so the attempt counter only moves once.
if (process.env.TESTINY_UPLOAD && !process.env.TESTINY_RUN_NAME) process.env.TESTINY_RUN_NAME = nextRunName(MONSTERS_ENV);
const TESTINY_RUN_NAME = process.env.TESTINY_RUN_NAME ?? '';
const testiny: ReporterDescription[] = process.env.TESTINY_UPLOAD
  ? [
      [
        '@testiny/automation/reporters/playwright',
        {
          enable: true,
          project: process.env.TESTINY_PROJECT,
          sourceName: process.env.TESTINY_SOURCE ?? 'playwright-ui',
          enableAttachments: true,
          // One Testiny run per name: identified and titled by run_name.
          fixedValues: { run_name: TESTINY_RUN_NAME },
          runFields: ['run_name'],
          runTitlePattern: '%{run_name}',
          completeRuns: process.env.TESTINY_COMPLETE_RUN !== '0',
          // Copies each test's "platform" annotation (Desktop / Mobile, set in fixtures/base.ts) into Testiny.
          customResultFields: ['platform'],
        },
      ],
    ]
  : [];

/* list = console output, html = Playwright report, allure = graphical dashboard (npm run allure).
   Also used by merge.config.ts when CI merges the per-browser blob reports. */
export const reporters: ReporterDescription[] = [
  ['list'],
  ['html', { open: 'never' }],
  /*
   * Machine-readable results, only with JSON_REPORT=1 (npm run export:testiny:run): tools/export-testiny-csv.mjs
   * reads the named test steps from it. Off by default because it embeds every screenshot as text and grows
   * past what Node can write (RangeError: Invalid string length) on multi-browser runs.
   */
  ...(process.env.JSON_REPORT ? [['json', { outputFile: 'reports/playwright-results.json' }] as ReporterDescription] : []),
  [
    'allure-playwright',
    {
      resultsDir: 'allure-results',
      detail: true,
      suiteTitle: true,
      environmentInfo: {
        'Monsters environment': MONSTERS_ENV,
        'Monsters URL': MONSTERS_URL,
        Node: process.version,
        OS: process.platform,
      },
    },
  ],
  ...testiny,
];

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  /* Per-test limit (Playwright's default, made explicit) and the default wait of each expect(). */
  timeout: 30_000,
  expect: { timeout: 5_000 },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /*
   * Retries: the live and dev sites are on the internet, where one slow page load is normal. One retry there
   * (two on CI) means a test that passes on its second try is reported as "flaky", not failed.
   * The local copy gets no retries, so real failures show at once. RETRIES=n overrides.
   */
  retries: process.env.RETRIES ? Number(process.env.RETRIES) : process.env.CI ? 2 : MONSTERS_IS_LOCAL ? 0 : 1,
  /* Parallel workers: Playwright picks half the CPU cores locally; cap it on CI. */
  workers: process.env.CI ? 4 : undefined,
  /*
   * BLOB_REPORT=<name> (CI): each parallel browser job only saves a blob report (blob-report/report-<name>.zip);
   * the merge job then replays all of them through `reporters` (merge.config.ts): one Allure report, one
   * Testiny run. Otherwise the normal reporters run directly.
   */
  reporter: process.env.BLOB_REPORT ? [['list'], ['blob', { fileName: `report-${process.env.BLOB_REPORT}.zip` }]] : reporters,
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: MONSTERS_URL,
    /* The site marks elements with data-testid="...", which getByTestId() reads. */
    testIdAttribute: 'data-testid',
    /*
     * Explicit limits, so a slow page fails with a clear message instead of using up the whole 30 s test
     * timeout: one click/fill at most 15 s, one page load at most 30 s. Assertions wait up to 5 s (expect.timeout).
     */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    /* Headless by default; HEADED=1 / --headed (npm run tests asks) shows the browser windows. */
    headless: !process.env.HEADED,
    /*
     * Evidence for every test: a full-page screenshot at the end, whether it passed or failed.
     * Named test.step() blocks also get an "after step" screenshot (fixtures/base.ts).
     * Video: failures only by default; CAPTURE_ALL=1 (npm run report:full) keeps every video.
     */
    screenshot: { mode: 'on', fullPage: true },
    video: process.env.CAPTURE_ALL ? 'on' : 'retain-on-failure',
    trace: 'retain-on-failure',
  },

  projects: [
    /* Desktop browsers */
    {
      name: 'chromium',
      testMatch: DESKTOP_SPECS,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: DESKTOP_SPECS,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      /* Uses the Microsoft Edge installed on this machine. */
      name: 'edge',
      testMatch: DESKTOP_SPECS,
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    /*
     * Mobile view: every desktop test PLUS the phone-only layout tests, on each browser at phone size
     * (Pixel 7: 412 x 915, touch, mobile user agent).
     */
    {
      name: 'mobile-chrome',
      testMatch: [DESKTOP_SPECS, MOBILE_SPECS],
      use: { ...devices['Pixel 7'] },
    },
    {
      /* Firefox can't emulate a full mobile device (no isMobile), but runs at phone size with touch. */
      name: 'mobile-firefox',
      testMatch: [DESKTOP_SPECS, MOBILE_SPECS],
      use: {
        ...devices['Pixel 7'],
        browserName: 'firefox',
        isMobile: false,
        userAgent: 'Mozilla/5.0 (Android 14; Mobile; rv:131.0) Gecko/131.0 Firefox/131.0',
      },
    },
    {
      name: 'mobile-edge',
      testMatch: [DESKTOP_SPECS, MOBILE_SPECS],
      use: { ...devices['Pixel 7'], channel: 'msedge' },
    },

    /* Mac Safari and Chrome on BrowserStack (only with credentials; npm run tests > BrowserStack). */
    ...browserstackProjects,
  ],

  /* Host the local Substandard Monsters folder while tests run (only when testing the local copy). */
  webServer: !MONSTERS_IS_LOCAL
    ? undefined
    : {
        command: `node tools/serve-static.mjs "${MONSTERS_DIR}" ${MONSTERS_PORT}`,
        url: MONSTERS_URL,
        reuseExistingServer: !process.env.CI,
      },
});
