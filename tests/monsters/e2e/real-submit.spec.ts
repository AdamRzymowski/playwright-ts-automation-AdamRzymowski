import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import type { RequestDetails } from '../../../pages/monsters/MonstersPage';
import { REAL_SUBMIT_EMAIL } from '../../utils/testData';
import { FORMSUBMIT_SUCCESS } from '../../../fixtures/formsubmit-api';

/**
 * End-to-end: really submits the request form to FormSubmit, which emails the site owner.
 * Opt-in so normal runs never send email:
 *   SUBMIT_REAL_FORM=1 npx playwright test real-submit --project=chromium
 * Runs on Chromium only, so one run = one email.
 */
test.describe('Real form submission', () => {
  test.skip(!process.env.SUBMIT_REAL_FORM, 'Sends a real email - run with SUBMIT_REAL_FORM=1');
  test.use({ allowRealEmails: true });

  test('request form really reaches FormSubmit', { tag: ['@live-submit'] }, async ({ page, site }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Only one real email per run (Chromium)');
    await allure.epic('Substandard Monsters');
    await allure.feature('Request a print');
    await allure.story('Real submission');
    await allure.severity(allure.Severity.BLOCKER);

    const runId = new Date().toISOString();
    const request: RequestDetails = {
      name: 'Playwright Test Bot',
      email: REAL_SUBMIT_EMAIL,
      service: 'Not sure',
      quantity: 1,
      fileLink: '',
      description: `[AUTOMATED TEST - please ignore] Playwright end-to-end check of the request form, run ${runId}.`,
    };
    await allure.attachment('request.json', JSON.stringify(request, null, 2), 'application/json');

    await site.goto('#contact');
    await site.fillRequest(request);
    const responsePromise = page.waitForResponse(FORMSUBMIT);
    await site.submitButton.click();
    const response = await responsePromise;
    const body = await response.json().catch(() => ({}));
    const sent = response.request();
    await allure.attachment(
      'formsubmit-exchange.json',
      JSON.stringify({ request: { url: sent.url(), method: sent.method(), headers: sent.headers() }, status: response.status(), headers: response.headers(), body }, null, 2),
      'application/json',
    );

    await test.step('Request the browser sent', async () => {
      expect.soft(sent.method()).toBe('POST');
      expect.soft(sent.url()).toBe(await site.form.getAttribute('action'));
      expect.soft(sent.headers()['accept']).toBe('application/json');
      const payload = sent.postDataBuffer()?.toString('utf8') ?? '';
      expect.soft(payload).toContain(site.expectedSubject(request));
      expect.soft(payload).toContain(REAL_SUBMIT_EMAIL);
      expect.soft(payload).toContain('English');
    });

    await test.step('Backend response', async () => {
      expect.soft(response.status(), 'FormSubmit HTTP status').toBe(200);
      // FormSubmit labels its JSON reply text/html; record it instead of failing on it.
      await allure.parameter('Content-Type', response.headers()['content-type'] ?? '');
      // FormSubmit explains failures (e.g. "This form needs Activation") in body.message.
      expect(body, `FormSubmit says: ${body.message}`).toEqual(FORMSUBMIT_SUCCESS);
    });

    await test.step('Page shows the success state', async () => {
      await expect(site.formStatus).toHaveText(site.labels.ok);
      await expect(site.formStatus).toHaveClass(/\bok\b/);
      await expect(site.field('Name')).toHaveValue('');
      await expect(site.submitButton).toBeEnabled();
    });
  });
});
