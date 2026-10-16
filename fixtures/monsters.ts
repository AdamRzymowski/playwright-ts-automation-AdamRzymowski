import { test as base } from '@playwright/test';
import { MonstersPage } from '../pages/monsters/MonstersPage';
import { MONSTERS_URL } from '../sites';

/** Requests to FormSubmit, the service that emails the site's request form to the owner. */
export const FORMSUBMIT = '**/formsubmit.co/**';

type Options = {
  /** Let the form really reach FormSubmit (sends an email). Only tests/monsters/e2e/real-submit.spec.ts sets this. */
  allowRealEmails: boolean;
};

type Fixtures = {
  /** English page (index.html). */
  site: MonstersPage;
  /** Polish page (pl.html). */
  sitePl: MonstersPage;
  /** Always on: blocks real FormSubmit calls so tests never send emails, unless allowRealEmails is set. */
  blockRealEmails: void;
};

export const test = base.extend<Fixtures & Options>({
  baseURL: MONSTERS_URL,
  /* The site marks elements with data-testid="..." (saucedemo uses data-test). */
  testIdAttribute: 'data-testid',
  allowRealEmails: [false, { option: true }],

  blockRealEmails: [
    async ({ page, allowRealEmails }, use) => {
      // Registered first, so a test's own page.route(FORMSUBMIT, ...) mock takes priority.
      if (!allowRealEmails) await page.route(FORMSUBMIT, (route) => route.abort('blockedbyclient'));
      await use();
    },
    { auto: true },
  ],

  site: async ({ page }, use) => use(new MonstersPage(page, 'en')),
  sitePl: async ({ page }, use) => use(new MonstersPage(page, 'pl')),
});

export { expect } from '@playwright/test';
