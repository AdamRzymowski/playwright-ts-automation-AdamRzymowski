import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import type { FormField } from '../../../pages/monsters/MonstersPage';
import { createPrintRequest } from '../../utils/testData';

// SQL guard (site v1.8.0+): text shaped like database commands is caught in the page, shown with a red
// field badge and a warning block, and never sent. FormSubmit is mocked AND counted in every test here,
// so these strings never leave the browser (see the testing boundaries in CLAUDE.md).

const SQL_SAMPLES = {
  'always-true login trick': "admin' OR '1'='1",
  'numeric always-true': "' OR 1=1 --",
  'UNION SELECT': '1 UNION SELECT username, password FROM users',
  'DROP TABLE': "'; DROP TABLE users; --",
  'SELECT * FROM': 'SELECT * FROM orders',
  'DELETE FROM … WHERE': 'DELETE FROM orders WHERE 1=1',
  'INSERT INTO … VALUES': "INSERT INTO users (name) VALUES ('x')",
  'UPDATE … SET': "UPDATE users SET role='admin' WHERE id=1",
  'time delay probe': '1 AND SLEEP(5)',
  'comment after a quote': "admin'--",
};

// Everyday print requests that use the same words and must still go through.
const NORMAL_TEXT = {
  'select … from': 'Please select a colour from the list, black or red, for this dragon.',
  '"drop table" (gaming)': 'I need a drop table for my D&D game, printed in grey PLA please.',
  '"delete from"': 'Can you delete from the order the second dragon and make it bigger?',
  '"insert into"': 'Insert into the base two magnets please, so the model sticks to the board.',
  'apostrophes and dashes': "It's for my son's birthday (he's 7); the 'big' one -- thanks a lot!",
  'quotes and equals': "Print 'Dragon' or 'Wyvern' = whichever is cheaper, in red PETG please.",
};

/** Mocks FormSubmit and returns a counter of attempts to reach it. */
async function countSends(page: import('@playwright/test').Page) {
  const sent = { count: 0 };
  await page.route(FORMSUBMIT, (route) => {
    sent.count++;
    return route.fulfill({ json: { success: 'true' } });
  });
  return sent;
}

test.describe('Request form: SQL guard', () => {
  test.beforeEach(async ({ site }) => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Security');
    await allure.story('SQL guard');
    await site.goto('#contact');
  });

  for (const [kind, sample] of Object.entries(SQL_SAMPLES)) {
    test(`SQL guard blocks ${kind} in the description`, { tag: ['@security'] }, async ({ page, site }) => {
      await allure.severity(allure.Severity.CRITICAL);
      const sent = await countSends(page);
      await site.fillRequest(createPrintRequest({ description: `Please print a dragon for me. ${sample}` }));

      await site.submitButton.click();

      await expect(site.sqlWarning).toBeVisible();
      await expect(site.sqlWarning).toHaveText(site.labels.sqlWarning);
      await expect(site.fieldError('Description')).toHaveText(site.labels.badges.sql);
      await expect(site.field('Description')).toHaveAttribute('aria-invalid', 'true');
      await expect(site.successDialog).toBeHidden();
      expect(sent.count, 'nothing is sent').toBe(0);
    });
  }

  for (const field of ['Name', 'File link'] as FormField[]) {
    test(`SQL guard blocks SQL in the ${field} field`, { tag: ['@security'] }, async ({ page, site }) => {
      const sent = await countSends(page);
      await site.fillRequest(createPrintRequest());
      await site.field(field).fill("x'; DROP TABLE users; --");

      await site.submitButton.click();

      await expect(site.sqlWarning).toBeVisible();
      await expect(site.fieldError(field)).toHaveText(site.labels.badges.sql);
      expect(sent.count, 'nothing is sent').toBe(0);
    });
  }

  for (const [kind, text] of Object.entries(NORMAL_TEXT)) {
    test(`SQL guard lets normal text through: ${kind}`, { tag: ['@security'] }, async ({ page, site }) => {
      const sent = await countSends(page);
      await site.fillRequest(createPrintRequest({ description: text }));

      await site.submitButton.click();

      await expect(site.formStatus).toHaveText(site.labels.ok);
      await expect(site.sqlWarning).toBeHidden();
      expect(sent.count).toBe(1);
    });
  }

  test('SQL warning clears once the text is fixed', async ({ page, site }) => {
    const sent = await countSends(page);
    await site.fillRequest(createPrintRequest({ description: 'Please print this. SELECT * FROM users' }));
    await site.submitButton.click();
    await expect(site.sqlWarning).toBeVisible();

    await site.field('Description').fill('Please print this dragon in grey resin, about 10 cm tall.');

    await expect(site.sqlWarning).toBeHidden();
    await expect(site.fieldError('Description')).toBeHidden();
    await site.submitButton.click();
    await expect(site.formStatus).toHaveText(site.labels.ok);
    expect(sent.count).toBe(1);
  });

  test('SQL warning is in Polish on the Polish page', async ({ page, sitePl }) => {
    const sent = await countSends(page);
    await sitePl.goto('#contact');
    await sitePl.fillRequest(createPrintRequest({ service: 'Druk FDM', description: "Proszę wydrukować smoka. ' OR 1=1 --" }));

    await sitePl.submitButton.click();

    await expect(sitePl.sqlWarning).toHaveText(sitePl.labels.sqlWarning);
    await expect(sitePl.fieldError('Description')).toHaveText(sitePl.labels.badges.sql);
    expect(sent.count).toBe(0);
  });

  test('SQL warning has enough contrast', async ({ page, site }) => {
    await countSends(page);
    await site.fillRequest(createPrintRequest({ description: 'Please print this. UNION SELECT password FROM users' }));
    await site.submitButton.click();
    await expect(site.sqlWarning).toBeVisible();

    const { default: AxeBuilder } = await import('@axe-core/playwright');
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).include('[data-testid="form-sql-warning"]').analyze();
    expect(results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' ')))).toEqual([]);
  });
});
