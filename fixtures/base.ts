import { test as base } from '@playwright/test';
import * as allure from 'allure-js-commons';

export type Platform = 'Desktop' | 'Mobile';

/** Mobile projects are named mobile-*, everything else runs on a desktop browser. */
export function platformOf(projectName: string): Platform {
  return projectName.startsWith('mobile') ? 'Mobile' : 'Desktop';
}

/**
 * Shared base for every site's fixtures. Labels each test Desktop or Mobile in Allure
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
