---
name: test-creation-template
description: Template and checklist for adding new tests to the Substandard Monsters test project (Playwright + TypeScript). Use EVERY time the user asks to add, create or write a test, a check or test cases, one or many. Every test is first written as a test case definition (short title, platform type, prerequisites, test data, numbered steps, assertions per step), then turned into BOTH the automated Playwright test and the matching manual test case, so the two always agree and are easy to understand. Also covers placement, naming, the code template, FormSubmit mocking, screenshots, running, and logging known issues.
---

# Test creation template

## Description

This skill is how every new test is made in this project. The heart of it is the **test case
definition**: a short, plain-language record of one test with a **title, prerequisites, test data,
numbered steps and the assertions for each step**, plus its **platform type**. It is written *before*
any code. Both outputs are
produced from it:

- the **automated test** (Playwright): same title, prerequisites as setup, one `test.step` per step with
  that step's assertions as `expect(...)` calls;
- the **manual test case** (`Manual tests/manual-test-cases.mjs`, exported to CSV/PDF and Testiny): same
  title, prerequisites, steps and expected results.

So anyone can read what a test does without reading code, run it by hand, and see the same structure in the
reports (each step and each assertion appears there with a ✓/✗ screenshot).

Follow every section, in order. Read `CLAUDE.md` first (testing boundaries).

## 1. Understand what to test
- Restate in one line what the test proves. If it's unclear what "correct" looks like, ask before writing.
- Look at the real page (live site and/or `../Substandard-Monsters`): the elements' `data-testid`
  attributes and the exact visible texts (English **and** Polish if the text is translated).

## 2. Write the test case definition (required for every test)
Fill in this block for each test and show it to the user with the result. Keep every line short and in
plain words a non-programmer understands.

```
Title:          <short sentence saying what is checked, e.g. "Quantity 0 is rejected">
Area:           <feature › story, e.g. Request a print › Validation>
Platform type:  <Desktop | Mobile (phone) | Tablet | API (no browser)>, with browsers and screen size,
                e.g. "Desktop: Chrome, Firefox, Edge, 1280 x 720" or "Mobile: Chrome, Firefox, Edge at 412 x 915, touch"
Priority:       <Critical | High | Medium | Low>
Prerequisites:  <state before step 1: page/URL, language, what is mocked or blocked, logged data>
Test data:      <values used, e.g. name from Faker, email TEST_EMAIL, quantity "0">
Steps and assertions:
  1. <action>                 → Expect: <observable result 1>; <result 2>
  2. <action>                 → Expect: <observable result>
  …
```

Rules for the definition:
- **Title**: short sentence, sentence case, present tense, ideally under 70 characters, no codes; starts with
  the thing tested (`Success pop-up closes with the Escape key`). Unique within its spec file.
- **Prerequisites**: everything that must be true before step 1, including mocks ("FormSubmit reply faked:
  success") so nothing real is sent. If none: "Site open at <page>".
- **Steps**: 1–6 numbered actions a person could do by hand; one action per step.
- **Assertions**: every step has at least one "Expect:", each one checkable by looking at the page (or the
  response, for API tests). No step without an assertion.
- **Platform type** (required): where the test is meant to run and be checked by hand:
  - **Desktop**: Chrome, Firefox, Edge at desktop size (≥ 1280 px wide); spec in `tests/monsters/e2e/`.
  - **Mobile (phone)**: Chrome, Firefox, Edge at phone size (Pixel 7, 412 x 915, touch); phone-only layout
    checks go in `tests/monsters/mobile/`. Note: every e2e test also runs in phone view automatically.
  - **Tablet**: 768 x 1024 (set with `test.use({ viewport })` inside a mobile spec).
  - **API (no browser)**: direct requests to the form's backend; spec in `tests/monsters/api/`.
  - **BrowserStack Mac** (optional extra): Safari / Chrome on macOS for compatibility runs.
  Name the platform type in the definition, pick the folder in section 3 to match it, and carry it into the
  manual case's `platform` field (section 5).
- **Test data**: concrete values or the builder that makes them; never real personal data.

## 3. Pick the place
| Test | Folder | Runs on |
| --- | --- | --- |
| Behaviour a visitor sees (default) | `tests/monsters/e2e/` | Chrome, Firefox, Edge at desktop **and** phone size |
| Phone-only layout (hamburger, stacking) | `tests/monsters/mobile/` | the three browsers at phone size |
| Request form backend, no browser | `tests/monsters/api/` | the `api` project |

Tags: `@a11y` (accessibility) and `@security` (security) on the test or its `describe` so `npm run tests` can
pick them; `@smoke` for the most important checks. Use the existing spec file for the area if there is one;
otherwise create `<area>.spec.ts`.

## 4. Write the automated test from the definition
Map it one-to-one: **title → test title**, **platform type → spec folder / projects**,
**prerequisites → setup + `allure.description`**, **each step →
one `test.step` named like the step**, **each "Expect:" → an `expect(...)` inside that step**.

```ts
import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { createPrintRequest } from '../../utils/testData';

test.describe('<Area>', () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('<Feature>');   // e.g. 'Request a print'
    await allure.story('<Story>');       // e.g. 'Validation'
  });

  test('Quantity 0 is rejected', async ({ page, site }) => {
    await allure.severity(allure.Severity.NORMAL);
    await allure.description('Prerequisites: request form open (English); FormSubmit reply faked, nothing is sent.');

    // Prerequisites
    let sent = 0;
    await page.route(FORMSUBMIT, (route) => {
      sent++;
      return route.fulfill({ json: { success: 'true' } });
    });
    await site.goto('#contact');

    await test.step('1. Fill in the required fields and type 0 in Quantity', async () => {
      await site.fillRequest(createPrintRequest());
      await site.field('Quantity').fill('0');
      await expect(site.field('Quantity')).toHaveValue('0');
    });

    await test.step('2. Click "Send request"', async () => {
      await site.submitButton.click();
      await expect(site.fieldError('Quantity')).toHaveText(site.labels.badges.quantity);
      await expect(site.formStatus).toHaveText(site.labels.fix);
      expect(sent, 'nothing is sent').toBe(0);
    });
  });
});
```
Code rules:
- Import `test` and `expect` from `fixtures/monsters` (`fixtures/formsubmit-api` for API tests), never from
  `@playwright/test`: that `expect` attaches a **✓ passed / ✗ failed screenshot to every assertion**, and the
  fixtures add step screenshots, Desktop/Mobile labels and FormSubmit blocking.
- Locators and texts live in `pages/monsters/MonstersPage.ts` (`getByTestId`, `getByRole`; no CSS/XPath in
  specs). Add new ones there, with EN and PL texts in `LABELS`.
- Test data from `tests/utils/testData.ts` (Faker builders, `TEST_EMAIL`).
- Use `expect.soft` when one step checks several independent things, so all of them are reported.
- Loop-generated tests: each item still yields a full definition (same steps, its own data and title).
- Never send real requests, injection strings or load to third parties (CLAUDE.md "Testing boundaries").
  Real submissions only in opt-in tests that skip unless `SUBMIT_REAL_FORM=1`, Chromium only.

## 5. Write the manual test case from the same definition
Append it at the **end** of `CASES` in `Manual tests/manual-test-cases.mjs` (never in the middle: case numbers
MT-xxx come from the position):

```js
m({
  title: 'Quantity 0 is rejected',                       // = Title
  area: 'Request a print > Validation',                   // = Area
  platform: 'desktop',                                     // = Platform type (desktop | mobile | smallPhone | tablet)
  priority: 'Medium',                                      // = Priority
  pre: M_OPEN + ' Click "Request a print".',               // = Prerequisites (+ test data where useful)
  steps: [                                                 // = Steps and assertions, one row each
    ['Fill in the required fields and type 0 in Quantity.', 'The field shows 0.'],
    ['Click "Send request".', 'Quantity turns red with "Enter 1 to 10,000"; "Please check the fields marked in red."; nothing is sent.'],
  ],
  auto: 'monsters/e2e/form-limits.spec.ts › Quantity 0 is rejected',   // spec path under tests/ › test title
}),
```
Then run `npm run manual:build`; it must say **all matched** (one manual case per automated UI test).

## 6. Run it
1. `npx playwright test <file> -g "<title>" --project=chromium` against the right site
   (`MONSTERS_ENV=local` for unpublished changes, `live` for the published site) until it passes, or fails
   only because of a real site bug.
2. Run it on every project for its folder, and repeat a new test 3 times (`--repeat-each=3`) to rule out
   flakiness. Don't pass `--reporter=...` if you want to check the Allure screenshots (it disables Allure).
3. Only run real-submission tests when the user has asked for it (they send emails).

## 7. If it finds a bug
Add an entry to `KNOWN-ISSUES.md` (next KI number, severity, steps to reproduce from the definition,
expected/actual, possible fix, the covering test) and tell the user. Leave the test failing; never weaken it
to pass.

## 8. Finish
- Update `README.md` if a new area or command was added.
- Commit with a clear message; ask before pushing.
- Report to the user: the **test case definition(s)** (including platform type), where the test(s) went, the result per browser, the
  manual case number(s), and any known issue logged.
