import { defineConfig, type ReporterDescription } from '@playwright/test';
import baseConfig, { reporters } from './playwright.config';

/**
 * Used by CI after the browsers ran in parallel, each saving a blob report:
 *   npx playwright merge-reports --config merge.config.ts ./all-blob-reports
 * Replays every browser's results through the normal reporters, so there is one HTML report, one Allure
 * report and (with TESTINY_UPLOAD=1) one Testiny run for the whole regression.
 * allure-playwright is swapped for a merge-safe wrapper (merge-allure-reporter.ts).
 */
const mergeReporters: ReporterDescription[] = reporters.map(([name, options]) =>
  name === 'allure-playwright' ? (['./merge-allure-reporter.ts', options] as ReporterDescription) : ([name, options] as ReporterDescription),
);

export default defineConfig({
  testDir: baseConfig.testDir,
  reporter: mergeReporters,
});
