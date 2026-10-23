// Lint (npm run lint): TypeScript rules plus Playwright's own rules, which catch common test mistakes
// such as a missing await, fixed waits, or a test.only left in.
import playwright from 'eslint-plugin-playwright';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'allure-results/', 'allure-report/', 'reports/', 'test-results/', 'playwright-report/', '**/*.mjs', 'Manual tests/'],
  },
  ...tseslint.configs.recommended,
  {
    files: ['tests/**/*.ts'],
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      // Our own fixtures/monsters.ts `expect` wraps Playwright's; tell the rules about it.
      'playwright/no-standalone-expect': 'error',
      // Raw CSS/XPath belongs in pages/monsters (CLAUDE.md); getByTestId/getByRole are fine.
      'playwright/no-raw-locators': ['warn', { allowed: ['iframe', '[role]'] }],
      // Conditional logic in tests: allowed where a test deliberately branches on browser or screen size.
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      // Helpers that assert inside (contrast.spec.ts).
      'playwright/expect-expect': ['warn', { assertFunctionNames: ['checkContrast'] }],
    },
  },
  {
    // perf/: k6 scripts (k6 globals such as __ENV; `any` for k6's untyped summary data).
    files: ['perf/**/*.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
