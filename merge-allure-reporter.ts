import AllureReporter from 'allure-playwright';
import type { FullConfig } from '@playwright/test/reporter';

/**
 * allure-playwright for `playwright merge-reports` (merge.config.ts). When merging, Playwright passes a config
 * without projects, and allure-playwright's onConfigure reads projects[0].outputDir, which throws
 * ("Cannot read properties of undefined (reading 'outputDir')"). Give it the default output folder instead.
 */
export default class AllureMergeReporter extends AllureReporter {
  onConfigure(config: FullConfig) {
    const projects = config.projects.length ? config.projects : [{ outputDir: 'test-results' }];
    return super.onConfigure({ ...config, projects } as FullConfig);
  }
}
