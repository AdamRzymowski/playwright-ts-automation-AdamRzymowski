import { defineConfig, devices } from '@playwright/test';

/**
 * Demo target: https://www.saucedemo.com (public e-commerce practice site).
 * Override with BASE_URL=... to point the suite elsewhere.
 *
 * Browsers run side by side: every desktop spec runs once per desktop project, every
 * mobile spec once per mobile project, spread across parallel workers.
 * Playwright drives its own browsers, so no chromedriver/geckodriver/msedgedriver is needed.
 *
 * See https://playwright.dev/docs/test-configuration.
 */
const DESKTOP_SPECS = /tests[\\/]e2e[\\/].*\.spec\.ts/;
const MOBILE_SPECS = /tests[\\/]mobile[\\/].*\.spec\.ts/;

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
          Site: process.env.BASE_URL ?? 'https://www.saucedemo.com',
          Node: process.version,
          OS: process.platform,
        },
      },
    ],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.saucedemo.com',
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
});
