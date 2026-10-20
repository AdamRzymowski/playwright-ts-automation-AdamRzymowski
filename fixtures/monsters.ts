import { test as base, flushAssertionScreenshots, setActivePage, withStepScreenshots } from './base';
import { MonstersPage } from '../pages/monsters/MonstersPage';
import { MONSTERS_URL } from '../sites';

/** Requests to FormSubmit, the service that emails the site's request form to the owner. */
export const FORMSUBMIT = '**/formsubmit.co/**';

/** Exact JSON FormSubmit returns for an accepted submission (success is the string "true"). */
export const FORMSUBMIT_SUCCESS = { success: 'true', message: 'The form was submitted successfully.' } as const;

type Options = {
  /** Let the form really reach FormSubmit (sends an email). Only tests/monsters/e2e/real-submit.spec.ts sets this. */
  allowRealEmails: boolean;
};

type Fixtures = {
  /** English page (index.html). */
  site: MonstersPage;
  /** Polish page (pl.html). */
  sitePl: MonstersPage;
  /** Always on: blocks real FormSubmit calls so tests never send emails, unless allowRealEmails is set.
   *  Also tells step screenshots which page to capture. */
  blockRealEmails: void;
};

export const test = withStepScreenshots(
  base.extend<Fixtures & Options>({
    baseURL: MONSTERS_URL,
    /* The site marks elements with data-testid="..." (also the default in playwright.config.ts). */
    testIdAttribute: 'data-testid',
    allowRealEmails: [false, { option: true }],

    blockRealEmails: [
      async ({ page, allowRealEmails }, use) => {
        // Registered first, so a test's own page.route(FORMSUBMIT, ...) mock takes priority.
        if (!allowRealEmails) await page.route(FORMSUBMIT, (route) => route.abort('blockedbyclient'));
        setActivePage(page);
        await use();
        await flushAssertionScreenshots();
        setActivePage(undefined);
      },
      { auto: true },
    ],

    site: async ({ page }, use) => use(new MonstersPage(page, 'en')),
    sitePl: async ({ page }, use) => use(new MonstersPage(page, 'pl')),
  }),
);

/** expect with a pass/fail screenshot after every assertion (fixtures/base.ts). */
export { expect } from './base';
