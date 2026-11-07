import { defineConfig } from 'allure';

/*
 * Tests are labelled Desktop or Mobile by fixtures/base.ts (parentSuite), so "All tests" opens with a Desktop and a
 * Mobile group. Separate Desktop/Mobile views were removed: each held another full copy of every screenshot.
 */
const groupBy = ['parentSuite', 'epic', 'feature', 'story'];

/*
 * Each entry under `plugins` is one view on the report's start page:
 * the key is its URL folder, `import` the Allure plugin that draws it, `reportName` its title.
 * "awesome" plugin = list of tests with steps, screenshots and videos; "dashboard" plugin = charts.
 */
export default defineConfig({
  name: 'Playwright TS Automation',
  output: './allure-report',
  // Keeps a record of past runs so the report can draw trend charts.
  historyPath: './allure-history/history.jsonl',
  plugins: {
    'all-tests': {
      import: '@allurereport/plugin-awesome',
      options: { reportName: 'All tests', reportLanguage: 'en', groupBy },
    },
    charts: {
      import: '@allurereport/plugin-dashboard',
      options: { reportName: 'Charts' },
    },
  },
});
