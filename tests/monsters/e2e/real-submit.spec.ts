import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import type { RequestDetails } from '../../../pages/monsters/MonstersPage';
import { TEST_EMAIL } from '../../utils/testData';

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
      email: TEST_EMAIL,
      service: 'Not sure',
      quantity: 1,
      material: 'automated test - no print needed',
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
    await allure.attachment('formsubmit-response.json', JSON.stringify(body, null, 2), 'application/json');

    expect(response.status(), 'FormSubmit HTTP status').toBe(200);
    // FormSubmit explains failures (e.g. "This form needs Activation") in body.message.
    expect(String(body.success), `FormSubmit says: ${body.message}`).toBe('true');
    await expect(site.formStatus).toHaveText(site.labels.ok);
    await expect(site.formStatus).toHaveClass(/\bok\b/);
    await expect(site.field('Name')).toHaveValue('');
  });
});
