---
name: test-creation-template
description: Template and checklist for adding a new automated test to this project (Substandard Monsters website, Playwright + TypeScript). Use EVERY time the user asks to add, create or write a test, a check, or test cases for something - one test or many. Covers where the test goes, how to name it, the code template, mocking FormSubmit, screenshots, running it, the matching manual test case and known issues.
---

# Test creation template

Follow every step, in order, each time a test is added. Read `CLAUDE.md` first (testing boundaries).

## 1. Understand what to test
- Restate in one line what the test proves. If it's unclear what "correct" looks like, ask before coding.
- Look at the real page (live site and/or `../Substandard-Monsters`): find the elements' `data-testid`
  attributes and the exact visible texts (English **and** Polish if the text is translated).

## 2. Pick the place
| Test | Folder | Runs on |
| --- | --- | --- |
| Behaviour a visitor sees (default) | `tests/monsters/e2e/` | Chrome, Firefox, Edge at desktop **and** phone size |
| Phone-only layout (hamburger, stacking) | `tests/monsters/mobile/` | the three browsers at phone size |
| Request form backend, no browser | `tests/monsters/api/` | the `api` project |

Add `{ tag: '@a11y' }` to accessibility tests and `{ tag: ['@security'] }` to security tests (on the test or
its `describe`) so `npm run tests` can pick them. Add `@smoke` to the most important checks.
Put the test in the existing spec file for that area if there is one; otherwise create `<area>.spec.ts`.

## 3. Name it
The title is a **short sentence that says what is checked and makes sense on its own**:
- Sentence case, present tense, ideally under 70 characters, no ticket or WCAG codes.
- Starts with the thing being tested: `Success pop-up closes with the Escape key`,
  `Quantity 0 is rejected`, `Gallery photos open with the keyboard`.
- Loop-generated tests build the same kind of sentence: `` `File link rejects ${kind}` ``.
- Unique within its file (the manual cases link to tests by title).

## 4. Write it
```ts
import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { createPrintRequest } from '../../utils/testData';

test.describe('<Area>', () => {
  test.beforeEach(async ({ site }) => {
    await allure.epic('Substandard Monsters');
    await allure.feature('<Feature>');          // e.g. 'Request a print', 'Gallery', 'Security'
    await allure.story('<Story>');              // optional sub-area
    await site.goto('#contact');                // or site.goto() / sitePl.goto()
  });

  test('<Brief description of what is checked>', { tag: ['@smoke'] }, async ({ page, site }) => {
    await allure.severity(allure.Severity.CRITICAL); // BLOCKER / CRITICAL / NORMAL / MINOR
    // FormSubmit must be mocked unless the user asked for a real submission (it emails the owner).
    await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'true' } }));

    await test.step('<phase in plain words>', async () => {
      await site.fillRequest(createPrintRequest());
      await site.submitButton.click();
    });

    await test.step('<what the visitor should see>', async () => {
      await expect(site.successDialog).toBeVisible();
      await expect.soft(site.successTitle).toHaveText(site.labels.dialog.title);
    });
  });
});
```
Rules:
- Import `test` and `expect` from `fixtures/monsters` (`fixtures/formsubmit-api` for API tests), never from
  `@playwright/test`: that `expect` takes the **pass/fail screenshot of every assertion**, and the fixtures add
  step screenshots, Desktop/Mobile labels and FormSubmit blocking.
- Locators and texts live in `pages/monsters/MonstersPage.ts` (`getByTestId`, `getByRole`; no CSS/XPath in
  specs). Add new ones there, with EN and PL texts in `LABELS`.
- Test data from `tests/utils/testData.ts` (Faker builders, `TEST_EMAIL`). Don't hardcode names in specs.
- `expect.soft` when one test checks several independent things; `test.step` to name phases.
- Never send real requests, injection strings or load to third parties (CLAUDE.md "Testing boundaries").
- Real submissions only in opt-in tests that skip unless `SUBMIT_REAL_FORM=1`, Chromium only.

## 5. Run it
1. `npx playwright test <file> -g "<title>" --project=chromium` against the right site (`MONSTERS_ENV=local`
   for unpublished changes, `live` for the published site) until it passes, or fails only because of a real
   site bug.
2. Run it on every browser in that folder's projects. Repeat a new test 3 times
   (`--repeat-each=3`) to make sure it isn't flaky.
3. Only run real-submission tests when the user has asked for it (they send emails).

## 6. Add the manual test case
- Append a case at the **end** of `CASES` in `Manual tests/manual-test-cases.mjs` (never in the middle: case
  numbers MT-xxx come from the position). Include title, area, platform, priority, preconditions, steps with
  expected results, and `auto: '<spec file under tests/> › <test title>'` (add the describe name when the
  title repeats in the file).
- Run `npm run manual:build`; it must say **all matched**.

## 7. If it finds a bug
Add an entry to `KNOWN-ISSUES.md` (next KI number, severity, steps to reproduce, expected/actual, possible fix,
the covering test) and tell the user. Leave the test failing; don't weaken it to pass.

## 8. Finish
- Update `README.md` if a new area or command was added.
- Commit with a clear message; ask before pushing.
- Report: which tests were added (their titles), where, the result per browser, and any known issue logged.
