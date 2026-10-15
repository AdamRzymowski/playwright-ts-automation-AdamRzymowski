import { defineConfig, devices } from '@playwright/test';
import { MONSTERS_DIR, MONSTERS_PORT, MONSTERS_URL, SAUCEDEMO_URL } from './sites';

/**
 * Sites under test (URLs in sites.ts):
 * - tests/saucedemo/  https://www.saucedemo.com, public e-commerce practice site (BASE_URL to override)
 * - tests/monsters/   Substandard Monsters website, served from the local ../Substandard-Monsters
 *                     folder (MONSTERS_DIR / MONSTERS_URL to override)
 *
 * Browsers run side by side: every desktop spec runs once per desktop project, every
 * mobile spec once per mobile project, spread across parallel workers.
 * Playwright drives its own browsers, so no chromedriver/geckodriver/msedgedriver is needed.
 *
 * See https://playwright.dev/docs/test-configuration.
 */
const DESKTOP_SPECS = /[\\/]e2e[\\/].*\.spec\.ts$/;
const MOBILE_SPECS = /[\\/]mobile[\\/].*\.spec\.ts$/;

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup.ts',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Parallel workers: Playwright picks half the CPU cores locally; cap it on CI. */
  workers: process.env.CI ? 4 : undefined,
  /* list = console output, html = Playwright report, allure = graphical dashboard (npm run allure) */
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          'Saucedemo URL': SAUCEDEMO_URL,
          'Monsters URL': MONSTERS_URL,
          Node: process.version,
          OS: process.platform,
        },
      },
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Default site; Monsters specs override this in fixtures/monsters.ts. */
    baseURL: SAUCEDEMO_URL,
    /* saucedemo marks elements with data-test="...", so getByTestId() reads that attribute. */
    testIdAttribute: 'data-test',
    /* Headless by default; `npm run test:headed` or `npm run test:ui` to watch. */
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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

    /* Mobile emulation (viewport, touch, mobile user agent). Firefox has no mobile emulation. */
    {
      name: 'mobile-chrome',
      testMatch: MOBILE_SPECS,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-edge',
      testMatch: MOBILE_SPECS,
      use: { ...devices['Pixel 7'], channel: 'msedge' },
    },
  ],

  /* Host the local Substandard Monsters folder while tests run (skipped when MONSTERS_URL is set). */
  webServer: process.env.MONSTERS_URL
    ? undefined
    : {
        command: `node tools/serve-static.mjs "${MONSTERS_DIR}" ${MONSTERS_PORT}`,
        url: MONSTERS_URL,
        reuseExistingServer: !process.env.CI,
      },
});
