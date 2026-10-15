import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { createPrintRequest, MONSTER_SERVICES } from '../../utils/testData';

// FormSubmit is always mocked here (see fixtures/monsters.ts): these tests never send real emails.

test.describe('Request form', () => {
  test.beforeEach(async ({ site }) => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Request a print');
    await site.goto('#contact');
  });

  test('sends every field and shows a thank-you message', { tag: ['@smoke'] }, async ({ page, site }) => {
    await allure.severity(allure.Severity.BLOCKER);
    const request = createPrintRequest({ delivery: 'Post it to me' });
    await allure.attachment('request.json', JSON.stringify(request, null, 2), 'application/json');

    let sent: Record<string, string> = {};
    await page.route(FORMSUBMIT, async (route) => {
      sent = Object.fromEntries(new URLSearchParams(await multipartToQuery(route.request().postDataBuffer())));
      await route.fulfill({ json: { success: 'true', message: 'The form was submitted successfully.' } });
    });

    await site.fillRequest(request);
    await site.submitButton.click();

    await test.step('user sees confirmation and a cleared form', async () => {
      await expect(site.formStatus).toHaveText(site.labels.ok);
      await expect(site.formStatus).toHaveClass(/\bok\b/);
      await expect(site.field('name')).toHaveValue('');
      await expect(site.field('message')).toHaveValue('');
      await expect(site.submitButton).toBeEnabled();
    });

    await test.step('FormSubmit received the right data', async () => {
      expect.soft(sent.name).toBe(request.name);
      expect.soft(sent.email).toBe(request.email);
      expect.soft(sent.phone).toBe(request.phone);
      expect.soft(sent.print_type).toBe(request.service);
      expect.soft(sent.quantity).toBe(String(request.quantity));
      expect.soft(sent.needed_by).toBe(request.neededBy);
      expect.soft(sent.delivery).toBe('Post it to me');
      expect.soft(sent.file_link).toBe(request.fileLink);
      expect.soft(sent.message).toBe(request.message);
      expect.soft(sent.language).toBe('English');
      expect.soft(sent._subject).toBe('New print request - Substandard Monsters');
      expect.soft(sent._honey).toBe('');
    });
  });

  test('required fields block sending', async ({ page, site }) => {
    await allure.severity(allure.Severity.CRITICAL);
    let calls = 0;
    await page.route(FORMSUBMIT, (route) => {
      calls++;
      return route.abort();
    });

    await site.submitButton.click();

    for (const name of ['name', 'email', 'print_type', 'message']) {
      const valid = await site.field(name).evaluate((el) => (el as HTMLInputElement).validity.valid);
      expect.soft(valid, `${name} should be invalid`).toBe(false);
    }
    expect(calls).toBe(0);
    await expect(site.formStatus).toBeEmpty();
  });

  test('rejects an invalid email address', async ({ page, site }) => {
    let calls = 0;
    await page.route(FORMSUBMIT, (route) => {
      calls++;
      return route.abort();
    });

    await site.fillRequest(createPrintRequest({ email: 'not-an-email' }));
    await site.submitButton.click();

    const typeMismatch = await site.field('email').evaluate((el) => (el as HTMLInputElement).validity.typeMismatch);
    expect(typeMismatch).toBe(true);
    expect(calls).toBe(0);
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

  test('shows an error when FormSubmit rejects the request', async ({ page, site }) => {
    await page.route(FORMSUBMIT, (route) =>
      route.fulfill({ json: { success: 'false', message: 'Form should POST' } }),
    );
    const request = createPrintRequest();

    await site.fillRequest(request);
    await site.submitButton.click();

    await expect(site.formStatus).toHaveText(site.labels.err);
    await expect(site.formStatus).toHaveClass(/\berr\b/);
    await expect(site.submitButton).toBeEnabled();
    // The user's text is kept so they can retry.
    await expect(site.field('message')).toHaveValue(request.message);
  });

  test('shows an error when the network fails', async ({ page, site }) => {
    await page.route(FORMSUBMIT, (route) => route.abort('internetdisconnected'));

    await site.fillRequest(createPrintRequest());
    await site.submitButton.click();

    await expect(site.formStatus).toHaveText(site.labels.err);
    await expect(site.submitButton).toBeEnabled();
  });

  test('service dropdown lists every service', async ({ site }) => {
    const options = await site.field('print_type').locator('option:not([value=""])').allTextContents();
    expect(options).toEqual([...MONSTER_SERVICES.en]);
  });
});

/** The page posts multipart/form-data; turn it into a query string so it can be read as key/value pairs. */
async function multipartToQuery(body: Buffer | null): Promise<string> {
  if (!body) return '';
  const text = body.toString('utf8');
  const boundary = text.slice(0, text.indexOf('\r\n'));
  const params = new URLSearchParams();
  for (const part of text.split(boundary)) {
    const match = part.match(/name="([^"]+)"\r\n\r\n([\s\S]*?)\r\n$/);
    if (match) params.append(match[1], match[2]);
  }
  return params.toString();
}
