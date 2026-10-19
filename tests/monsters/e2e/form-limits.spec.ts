import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { FORM_LIMITS, QUANTITY_RANGE, type LimitedField } from '../../../pages/monsters/MonstersPage';
import { createPrintRequest } from '../../utils/testData';
import { parseMultipart } from '../../utils/multipart';

// Character limits of the request form (site v1.6.0+): each field's maxlength, the site's own
// "Max. N characters" badge, the quantity range and the description counter.
// FormSubmit is always mocked here, so nothing is emailed.

/** A value of exactly `length` characters that is valid for the field. */
function valueOfLength(field: LimitedField, length: number): string {
  switch (field) {
    case 'email': {
      const domain = '@example.com';
      return 'a'.repeat(length - domain.length) + domain;
    }
    case 'File link': {
      const start = 'https://www.printables.com/model/';
      return start + '1'.repeat(length - start.length);
    }
    case 'Description': {
      // Real words, comfortably above the 5-word minimum.
      const text = 'Please print this dragon miniature in grey resin for my tabletop game. '.repeat(20);
      return text.slice(0, length - 1) + '.';
    }
    default:
      return 'Z'.repeat(length);
  }
}

const LIMITED = Object.entries(FORM_LIMITS) as [LimitedField, number][];
/** Field names as a visitor reads them, for test titles. */
const LABEL: Record<LimitedField, string> = { Name: 'Name', email: 'Email', 'File link': 'File link', Description: 'Description' };

test.describe('Request form limits', () => {
  test.beforeEach(async ({ site }) => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Request a print');
    await allure.story('Character limits');
    await site.goto('#contact');
  });

  test('Form fields declare their character limits', async ({ site }) => {
    for (const [field, limit] of LIMITED) {
      await expect.soft(site.field(field), field).toHaveAttribute('maxlength', String(limit));
    }
    await expect.soft(site.field('Quantity')).toHaveAttribute('min', String(QUANTITY_RANGE.min));
    await expect.soft(site.field('Quantity')).toHaveAttribute('max', String(QUANTITY_RANGE.max));
  });

  for (const [field, limit] of LIMITED) {
    test.describe(`${field} (max ${limit})`, () => {
      test(`${LABEL[field]} stops accepting typing at ${limit} characters`, async ({ site }) => {
        // Fill to one below the limit, then type three more characters: only one may get in.
        await site.field(field).fill(valueOfLength(field, limit - 1));
        await site.field(field).press('End');
        await site.field(field).pressSequentially('xyz');

        const length = await site.field(field).evaluate((el) => (el as HTMLInputElement).value.length);
        expect(length).toBe(limit);
      });

      test(`${LABEL[field]} accepts exactly ${limit} characters`, async ({ page, site }) => {
        let sent: Record<string, string> = {};
        await page.route(FORMSUBMIT, async (route) => {
          sent = parseMultipart(route.request().postDataBuffer());
          await route.fulfill({ json: { success: 'true' } });
        });
        const value = valueOfLength(field, limit);
        expect(value).toHaveLength(limit);

        await site.fillRequest(createPrintRequest());
        await site.field(field).fill(value);
        await site.submitButton.click();

        await expect(site.formStatus).toHaveText(site.labels.ok);
        expect(sent[field], `${field} sent unchanged`).toBe(value);
      });

      test(`${LABEL[field]} over ${limit} characters is blocked`, async ({ page, site }) => {
        await allure.description(
          'Typing cannot pass the limit, but autofill, a password manager or a script can put in longer text. ' +
            'The site then shows "Max. N characters" in the field and does not send.',
        );
        let calls = 0;
        await page.route(FORMSUBMIT, (route) => {
          calls++;
          return route.abort();
        });
        await site.fillRequest(createPrintRequest());
        await site.setValueDirectly(field, valueOfLength(field, limit + 1));

        await site.submitButton.click();

        await expect(site.fieldError(field)).toHaveText(site.labels.badges.tooLong(limit));
        await expect(site.field(field)).toHaveAttribute('aria-invalid', 'true');
        await expect(site.formStatus).toHaveText(site.labels.fix);
        expect(calls).toBe(0);
      });
    });
  }

  test.describe('Quantity range', () => {
    for (const ok of [QUANTITY_RANGE.min, QUANTITY_RANGE.max]) {
      test(`Quantity ${ok} is accepted`, async ({ page, site }) => {
        let sent: Record<string, string> = {};
        await page.route(FORMSUBMIT, async (route) => {
          sent = parseMultipart(route.request().postDataBuffer());
          await route.fulfill({ json: { success: 'true' } });
        });
        await site.fillRequest(createPrintRequest({ quantity: ok }));
        await site.submitButton.click();

        await expect(site.formStatus).toHaveText(site.labels.ok);
        expect(sent.Quantity).toBe(String(ok));
      });
    }

    for (const bad of ['0', '-1', String(QUANTITY_RANGE.max + 1), '2.5']) {
      test(`Quantity ${bad} is rejected`, async ({ page, site }) => {
        let calls = 0;
        await page.route(FORMSUBMIT, (route) => {
          calls++;
          return route.abort();
        });
        await site.fillRequest(createPrintRequest());
        await site.field('Quantity').fill(bad);
        await site.submitButton.click();

        await expect(site.fieldError('Quantity')).toHaveText(site.labels.badges.quantity);
        expect(calls).toBe(0);
      });
    }
  });

  test('Description counter counts characters and warns near the limit', async ({ site }) => {
    const limit = FORM_LIMITS.Description;
    const counter = site.descriptionCounter;

    await test.step('starts at 0', async () => {
      await expect(counter).toHaveText(`0 / ${limit}`);
    });

    await test.step('counts as you type', async () => {
      await site.field('Description').pressSequentially('hello world');
      await expect(counter).toHaveText(`11 / ${limit}`);
      await expect(counter).not.toHaveClass(/near-limit/);
    });

    await test.step('below 90%: no warning', async () => {
      await site.field('Description').fill('x'.repeat(limit * 0.9 - 1));
      await expect(counter).toHaveText(`${limit * 0.9 - 1} / ${limit}`);
      await expect(counter).not.toHaveClass(/near-limit/);
    });

    await test.step('from 90%: warning style', async () => {
      await site.field('Description').fill('x'.repeat(limit * 0.9));
      await expect(counter).toHaveClass(/near-limit/);
    });

    await test.step('at the limit', async () => {
      await site.field('Description').fill('x'.repeat(limit));
      await expect(counter).toHaveText(`${limit} / ${limit}`);
    });
  });

  test('Description counter resets after sending', async ({ page, site }) => {
    await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'true' } }));
    await site.fillRequest(createPrintRequest());
    await expect(site.descriptionCounter).not.toHaveText(`0 / ${FORM_LIMITS.Description}`);

    await site.submitButton.click();

    await expect(site.formStatus).toHaveText(site.labels.ok);
    await expect(site.descriptionCounter).toHaveText(`0 / ${FORM_LIMITS.Description}`);
  });

  test('Character limit message is in Polish on the Polish page', async ({ page, sitePl }) => {
    await page.route(FORMSUBMIT, (route) => route.abort());
    await sitePl.goto('#contact');
    await sitePl.fillRequest(createPrintRequest({ service: 'Druk FDM' }));
    await sitePl.setValueDirectly('Name', 'Z'.repeat(FORM_LIMITS.Name + 1));

    await sitePl.submitButton.click();

    await expect(sitePl.fieldError('Name')).toHaveText(sitePl.labels.badges.tooLong(FORM_LIMITS.Name));
    await expect(sitePl.formStatus).toHaveText(sitePl.labels.fix);
  });
});
