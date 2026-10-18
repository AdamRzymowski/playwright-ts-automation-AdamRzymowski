import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import type { FormField } from '../../../pages/monsters/MonstersPage';
import { createPrintRequest, MONSTER_SERVICES, words } from '../../utils/testData';

// FormSubmit is always mocked here (see fixtures/monsters.ts): these tests never send real emails.
// The one real submission lives in real-submit.spec.ts and is opt-in.

test.describe('Request form', () => {
  test.beforeEach(async ({ site }) => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Request a print');
    await site.goto('#contact');
  });

  test('shows every field, the required note and an empty status', async ({ site }) => {
    await allure.severity(allure.Severity.CRITICAL);

    for (const field of ['Name', 'email', 'Service', 'Quantity', 'File link', 'Description'] as FormField[]) {
      await expect.soft(site.field(field), field).toBeVisible();
      await expect.soft(site.field(field), field).toBeEditable();
    }
    for (const required of ['Name', 'email', 'Service', 'Description'] as FormField[]) {
      await expect.soft(site.field(required), `${required} is required`).toHaveAttribute('required', '');
    }
    for (const optional of ['Quantity', 'File link'] as FormField[]) {
      await expect.soft(site.field(optional), `${optional} is optional`).not.toHaveAttribute('required');
    }
    await expect.soft(site.field('Quantity')).toHaveValue('1');
    await expect.soft(site.field('Quantity')).toHaveAttribute('min', '1');
    await expect.soft(site.field('Description')).toHaveAttribute('data-min-words', '5');
    await expect.soft(site.requiredNote).toHaveText(site.labels.requiredNote);
    await expect.soft(site.submitButton).toHaveText(site.labels.submit);
    await expect.soft(site.formStatus).toBeEmpty();
  });

  test('sends every field and shows a thank-you message', { tag: ['@smoke'] }, async ({ page, site }) => {
    await allure.severity(allure.Severity.BLOCKER);
    const request = createPrintRequest();
    await allure.attachment('request.json', JSON.stringify(request, null, 2), 'application/json');

    let sent: Record<string, string> = {};
    await page.route(FORMSUBMIT, async (route) => {
      sent = parseMultipart(route.request().postDataBuffer());
      await route.fulfill({ json: { success: 'true', message: 'The form was submitted successfully.' } });
    });

    await site.fillRequest(request);
    await site.submitButton.click();

    await test.step('user sees confirmation and a cleared form', async () => {
      await expect(site.formStatus).toHaveText(site.labels.ok);
      await expect(site.formStatus).toHaveClass(/\bok\b/);
      await expect(site.field('Name')).toHaveValue('');
      await expect(site.field('Description')).toHaveValue('');
      await expect(site.field('Quantity')).toHaveValue('1');
      await expect(site.submitButton).toBeEnabled();
    });

    await test.step('FormSubmit received the right data', async () => {
      await allure.attachment('posted.json', JSON.stringify(sent, null, 2), 'application/json');
      expect.soft(sent.Name).toBe(request.name);
      expect.soft(sent.email).toBe(request.email);
      expect.soft(sent.Service).toBe(request.service);
      expect.soft(sent.Quantity).toBe(String(request.quantity));
      expect.soft(sent['File link']).toBe(request.fileLink);
      expect.soft(sent.Description).toBe(request.description);
      expect.soft(sent.Language).toBe('English');
      expect.soft(sent._subject).toBe(site.expectedSubject(request));
      expect.soft(sent._template).toBe('box');
      expect.soft(sent._captcha).toBe('false');
      expect.soft(sent._honey).toBe('');
    });
  });

  test('sends with only the required fields filled', async ({ page, site }) => {
    let sent: Record<string, string> = {};
    await page.route(FORMSUBMIT, async (route) => {
      sent = parseMultipart(route.request().postDataBuffer());
      await route.fulfill({ json: { success: true } });
    });
    const request = createPrintRequest();

    await site.field('Name').fill(request.name);
    await site.field('email').fill(request.email);
    await site.field('Service').selectOption(request.service);
    await site.field('Description').fill(request.description);
    await site.submitButton.click();

    await expect(site.formStatus).toHaveText(site.labels.ok);
    expect.soft(sent.Quantity).toBe('1');
    expect.soft(sent['File link']).toBe('');
  });

  test('posts to the FormSubmit address in the form', async ({ page, site }) => {
    await allure.severity(allure.Severity.BLOCKER);
    const action = await site.form.getAttribute('action');
    expect(action).toMatch(/^https:\/\/formsubmit\.co\/ajax\/\S+/);

    const requestPromise = page.waitForRequest(FORMSUBMIT);
    await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'true' } }));
    await site.fillRequest(createPrintRequest());
    await site.submitButton.click();

    const request = await requestPromise;
    expect.soft(request.url()).toBe(action);
    expect.soft(request.method()).toBe('POST');
    expect.soft(request.headers()['accept']).toBe('application/json');
    await expect(site.formStatus).toHaveText(site.labels.ok);
  });

  test.describe('Validation', () => {
    test.beforeEach(async () => {
      await allure.story('Validation');
    });

    // v1.6.0+: the site checks the fields itself and shows a red badge in each problem field,
    // plus "Please check the fields marked in red." under the button. Nothing is sent.

    test('required fields block sending', async ({ page, site }) => {
      await allure.severity(allure.Severity.CRITICAL);
      let calls = 0;
      await page.route(FORMSUBMIT, (route) => {
        calls++;
        return route.abort();
      });

      await site.submitButton.click();

      const b = site.labels.badges;
      const expected: [FormField, string][] = [
        ['Name', b.name],
        ['email', b.emailMissing],
        ['Service', b.service],
        ['Description', b.descriptionMissing],
      ];
      for (const [field, message] of expected) {
        await expect.soft(site.fieldError(field), field).toHaveText(message);
        await expect.soft(site.field(field), field).toHaveAttribute('aria-invalid', 'true');
      }
      await expect(site.formStatus).toHaveText(site.labels.fix);
      expect(calls).toBe(0);
    });

    for (const missing of ['Name', 'email', 'Service', 'Description'] as FormField[]) {
      test(`missing ${missing} alone blocks sending`, async ({ page, site }) => {
        let calls = 0;
        await page.route(FORMSUBMIT, (route) => {
          calls++;
          return route.abort();
        });
        await site.fillRequest(createPrintRequest());
        if (missing === 'Service') await site.field('Service').selectOption('');
        else await site.field(missing).fill('');

        await site.submitButton.click();

        await expect(site.fieldError(missing)).toBeVisible();
        await expect(site.field(missing)).toHaveAttribute('aria-invalid', 'true');
        // Only the missing field is flagged.
        for (const other of (['Name', 'email', 'Service', 'Description'] as FormField[]).filter((f) => f !== missing)) {
          await expect.soft(site.field(other), other).not.toHaveAttribute('aria-invalid', 'true');
        }
        expect(calls).toBe(0);
      });
    }

    test('rejects an invalid email address', async ({ page, site }) => {
      let calls = 0;
      await page.route(FORMSUBMIT, (route) => {
        calls++;
        return route.abort();
      });

      await site.fillRequest(createPrintRequest({ email: 'not-an-email' }));
      await site.submitButton.click();

      await expect(site.fieldError('email')).toHaveText(site.labels.badges.emailInvalid);
      expect(calls).toBe(0);
    });

    test('quantity below 1 is rejected', async ({ page, site }) => {
      let calls = 0;
      await page.route(FORMSUBMIT, (route) => {
        calls++;
        return route.abort();
      });

      await site.fillRequest(createPrintRequest({ quantity: 0 }));
      await site.submitButton.click();

      await expect(site.fieldError('Quantity')).toHaveText(site.labels.badges.quantity);
      expect(calls).toBe(0);
    });

    test('a fixed field clears its badge while typing', async ({ page, site }) => {
      await page.route(FORMSUBMIT, (route) => route.abort());
      await site.submitButton.click();
      await expect(site.fieldError('Name')).toBeVisible();

      await site.field('Name').fill('Anna Nowak');

      await expect(site.fieldError('Name')).toBeHidden();
      await expect(site.field('Name')).toHaveAttribute('aria-invalid', 'false');
    });

    test('description needs at least 5 words', { tag: ['@smoke'] }, async ({ page, site }) => {
      await allure.severity(allure.Severity.CRITICAL);
      let calls = 0;
      await page.route(FORMSUBMIT, (route) => {
        calls++;
        return route.fulfill({ json: { success: true } });
      });
      await site.fillRequest(createPrintRequest({ description: words(4) }));

      await test.step('4 words: blocked with a clear message', async () => {
        await site.submitButton.click();
        await expect(site.fieldError('Description')).toHaveText(site.labels.badges.minWords);
        expect(calls).toBe(0);
      });

      await test.step('extra spaces do not count as words', async () => {
        await site.field('Description').fill(`  ${words(2)}     ${words(2)}   `);
        await site.submitButton.click();
        await expect(site.fieldError('Description')).toHaveText(site.labels.badges.minWords);
        expect(calls).toBe(0);
      });

      await test.step('5 words: accepted and sent', async () => {
        await site.field('Description').fill(words(5));
        await expect(site.fieldError('Description')).toBeHidden();
        await site.submitButton.click();
        await expect(site.formStatus).toHaveText(site.labels.ok);
        expect(calls).toBe(1);
      });
    });

    test('hidden spam trap stays empty and out of reach', async ({ site }) => {
      const honey = site.form.locator('input[name="_honey"]');
      await expect(honey).toBeHidden();
      await expect(honey).toHaveAttribute('tabindex', '-1');
      await expect(honey).toHaveValue('');
    });
  });

  test.describe('Sending states and errors', () => {
    test.beforeEach(async () => {
      await allure.story('Sending and errors');
    });

    test('shows the "Sending…" state while waiting', async ({ page, site }) => {
      let release!: () => void;
      const held = new Promise<void>((r) => (release = r));
      await page.route(FORMSUBMIT, async (route) => {
        await held;
        await route.fulfill({ json: { success: true } });
      });

      await site.fillRequest(createPrintRequest());
      await site.submitButton.click();

      await expect(site.formStatus).toHaveText(site.labels.sending);
      await expect(site.submitButton).toBeDisabled();
      release();
      await expect(site.formStatus).toHaveText(site.labels.ok);
    });

    test('shows FormSubmit\'s reason when it rejects the request', async ({ page, site }) => {
      await allure.severity(allure.Severity.CRITICAL);
      await page.route(FORMSUBMIT, (route) =>
        route.fulfill({ json: { success: 'false', message: 'This form needs Activation.' } }),
      );
      const request = createPrintRequest();

      await site.fillRequest(request);
      await site.submitButton.click();

      await expect(site.formStatus).toHaveText(`${site.labels.err} (This form needs Activation.)`);
      await expect(site.formStatus).toHaveClass(/\berr\b/);
      await expect(site.submitButton).toBeEnabled();
      // The user's text is kept so they can retry.
      await expect(site.field('Description')).toHaveValue(request.description);
    });

    test('shows an error when the network fails', async ({ page, site }) => {
      await page.route(FORMSUBMIT, (route) => route.abort('internetdisconnected'));

      await site.fillRequest(createPrintRequest());
      await site.submitButton.click();

      // The browser's own reason (e.g. "Failed to fetch") is appended in brackets.
      await expect(site.formStatus).toContainText(site.labels.err);
      await expect(site.formStatus).toHaveClass(/\berr\b/);
      await expect(site.submitButton).toBeEnabled();
    });

    test('shows an error when FormSubmit returns a broken reply', async ({ page, site }) => {
      await page.route(FORMSUBMIT, (route) => route.fulfill({ status: 500, body: '<html>Server error</html>' }));

      await site.fillRequest(createPrintRequest());
      await site.submitButton.click();

      await expect(site.formStatus).toContainText(site.labels.err);
      await expect(site.submitButton).toBeEnabled();
    });

    test('can retry after an error and then succeed', async ({ page, site }) => {
      let attempt = 0;
      await page.route(FORMSUBMIT, (route) => {
        attempt++;
        return attempt === 1 ? route.abort('internetdisconnected') : route.fulfill({ json: { success: true } });
      });

      await site.fillRequest(createPrintRequest());
      await site.submitButton.click();
      await expect(site.formStatus).toContainText(site.labels.err);

      await site.submitButton.click();
      await expect(site.formStatus).toHaveText(site.labels.ok);
      await expect(site.formStatus).toHaveClass(/\bok\b/);
      expect(attempt).toBe(2);
    });
  });

  test('service dropdown lists every service', async ({ site }) => {
    const options = await site.field('Service').locator('option:not([value=""])').allTextContents();
    expect(options).toEqual([...MONSTER_SERVICES.en]);
  });

  test('"Request a print" buttons lead to the form', async ({ page, site }) => {
    await site.goto();
    await page.getByTestId('hero-request').click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(site.form).toBeInViewport();
  });
});

/** The page posts multipart/form-data; read it into field name -> value. */
function parseMultipart(body: Buffer | null): Record<string, string> {
  if (!body) return {};
  const text = body.toString('utf8');
  const boundary = text.slice(0, text.indexOf('\r\n'));
  const fields: Record<string, string> = {};
  for (const part of text.split(boundary)) {
    const match = part.match(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n$/);
    if (match) fields[match[1]] = match[2];
  }
  return fields;
}
