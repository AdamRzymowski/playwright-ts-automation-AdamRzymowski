import { test as base, type Page } from '@playwright/test';
import * as allure from 'allure-js-commons';

export type Platform = 'Desktop' | 'Mobile' | 'API';

/** Mobile projects are named mobile-*, the api project has no browser, everything else is desktop. */
export function platformOf(projectName: string): Platform {
  if (projectName === 'api') return 'API';
  return projectName.startsWith('mobile') ? 'Mobile' : 'Desktop';
}

/**
 * Shared base for every site's fixtures. Labels each test Desktop, Mobile or API in Allure
 * (parentSuite + a "platform" label) so the report can group and filter by it.
 */
export const test = base.extend<{ platformLabel: void }>({
  platformLabel: [
    async ({}, use, testInfo) => {
      const platform = platformOf(testInfo.project.name);
      // Read by the Testiny reporter (customResultFields: ['platform']).
      testInfo.annotations.push({ type: 'platform', description: platform });
      await allure.parentSuite(platform);
      await allure.label('platform', platform);
      await use();
    },
    { auto: true },
  ],
});

// ---- Step screenshots ------------------------------------------------------------------------
// Playwright already saves a screenshot at the end of every test (config: screenshot 'on').
// These add one after each named test.step(), so the report shows what the page looked like when
// each group of assertions passed, not only the final state.

let activePage: Page | undefined;

/** Called by the site fixtures so step screenshots know which page to capture. */
export function setActivePage(page: Page | undefined) {
  activePage = page;
}

async function attachStepScreenshot(title: string) {
  if (!activePage || activePage.isClosed()) return;
  try {
    const body = await activePage.screenshot({ fullPage: true });
    await base.info().attach(`after step: ${title}`, { body, contentType: 'image/png' });
  } catch {
    // A screenshot must never fail a test (e.g. the page is navigating).
  }
}

/** Wraps test.step so every step that completes attaches an "after step" screenshot inside the step. */
export function withStepScreenshots<T>(t: T): T {
  const target = t as unknown as { step: (...args: unknown[]) => Promise<unknown> };
  const original = target.step;
  const wrapped = (title: string, body: (info: unknown) => unknown, options?: unknown) =>
    original.call(
      t,
      title,
      async (info: unknown) => {
        const result = await body(info);
        await attachStepScreenshot(title);
        return result;
      },
      options,
    );
  // Keep test.step.skip and any other helpers hanging off the original.
  Object.assign(wrapped, original);
  target.step = wrapped as typeof original;
  return t;
}
