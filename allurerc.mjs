import { defineConfig } from 'allure';

export default defineConfig({
  name: 'Playwright TS Automation',
  output: './allure-report',
  // Keeps a record of past runs so the report can draw trend charts.
  historyPath: './allure-history/history.jsonl',
  plugins: {
    awesome: {
      options: {
        reportLanguage: 'en',
        groupBy: ['epic', 'feature', 'story'],
      },
    },
    dashboard: {
      options: {},
    },
  },
});
