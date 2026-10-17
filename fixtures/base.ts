import { test as base } from '@playwright/test';
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
