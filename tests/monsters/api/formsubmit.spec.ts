import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT_SUCCESS, REAL_SUBMISSIONS_ALLOWED } from '../../../fixtures/formsubmit-api';
import type { RequestDetails } from '../../../pages/monsters/MonstersPage';
import { MONSTER_SERVICES, REAL_SUBMIT_EMAIL } from '../../utils/testData';
import { MONSTERS_URL } from '../../../sites';

// Backend tests for the request form: the HTTP API behind it (FormSubmit), without a browser.
// "Contract" and "Endpoint" tests never send email. "Successful submission" tests send ONE real
// email each and only run with SUBMIT_REAL_FORM=1 (npm run test:api:submit).

const EXPECTED_HIDDEN = {
  en: { _subject: 'New print request - Substandard Monsters', Language: 'English' },
  pl: { _subject: 'Nowe zamówienie wydruku - Substandard Monsters', Language: 'Polski' },
};

test.describe('Request form API (FormSubmit)', { tag: '@api' }, () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Request form API');
  });

  test.describe('Contract', () => {
    test.beforeEach(async () => {
      await allure.story('Form contract');
    });

    for (const lang of ['en', 'pl'] as const) {
      test(`${lang.toUpperCase()} form posts to the FormSubmit AJAX endpoint with the right hidden fields`, async ({ formApi }) => {
        await allure.severity(allure.Severity.BLOCKER);
        const contract = await formApi.contract(lang);
        await allure.attachment(`form-contract-${lang}.json`, JSON.stringify(contract, null, 2), 'application/json');

        expect.soft(contract.method).toBe('POST');
        expect.soft(contract.action).toMatch(/^https:\/\/formsubmit\.co\/ajax\/\S+$/);
        expect.soft(contract.hidden._template, 'email layout').toBe('box');
        expect.soft(contract.hidden._captcha, 'no captcha page for AJAX').toBe('false');
        expect.soft(contract.hidden._honey, 'spam trap starts empty').toBe('');
        expect.soft(contract.hidden._subject).toBe(EXPECTED_HIDDEN[lang]._subject);
        expect.soft(contract.hidden.Language).toBe(EXPECTED_HIDDEN[lang].Language);
        expect.soft(contract.fieldNames).toEqual(
          expect.arrayContaining(['Name', 'email', 'Service', 'Quantity', 'File link', 'Description']),
        );
      });
    }

    test('EN and PL forms post to the same address', async ({ formApi }) => {
      const [en, pl] = await Promise.all([formApi.contract('en'), formApi.contract('pl')]);
      expect(pl.action).toBe(en.action);
    });
  });

  test.describe('Endpoint', () => {
    test.beforeEach(async () => {
      await allure.story('Endpoint behaviour');
    });

    test('rejects GET with 405 and a JSON body', async ({ request, formApi }) => {
      const { action } = await formApi.contract();
      const res = await request.get(action, { headers: { Accept: 'application/json' } });

      expect.soft(res.status()).toBe(405);
      expect.soft(res.headers()['content-type']).toContain('application/json');
      const body = await res.json();
      expect.soft(body).toHaveProperty('message');
      expect.soft(body.success, 'GET must not count as a submission').not.toBe('true');
    });

    test('allows the site to POST from the browser (CORS preflight)', async ({ request, formApi }) => {
      await allure.severity(allure.Severity.CRITICAL);
      const { action } = await formApi.contract();
      const res = await request.fetch(action, {
        method: 'OPTIONS',
        headers: {
          Origin: MONSTERS_URL,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'accept',
        },
      });
      const headers = res.headers();
      await allure.attachment('preflight-headers.json', JSON.stringify(headers, null, 2), 'application/json');

      expect.soft(res.ok(), `status ${res.status()}`).toBe(true);
      expect.soft(headers['access-control-allow-origin']).toMatch(new RegExp(`^(\\*|${MONSTERS_URL.replace(/[.]/g, '\\.')})$`));
      expect.soft(headers['access-control-allow-methods']).toContain('POST');
      expect.soft(headers['access-control-allow-headers']?.toLowerCase()).toContain('accept');
    });
  });

  test.describe('Successful submission (sends a real email)', () => {
    test.skip(!REAL_SUBMISSIONS_ALLOWED, 'Sends a real email - run with SUBMIT_REAL_FORM=1 (npm run test:api:submit)');

    test.beforeEach(async () => {
      await allure.story('Successful submission');
      await allure.severity(allure.Severity.BLOCKER);
    });

    test('accepts a complete English request and returns the success response', { tag: ['@live-submit'] }, async ({ formApi }) => {
      const contract = await formApi.contract('en');
      const details: RequestDetails = {
        name: 'Playwright API Test',
        email: REAL_SUBMIT_EMAIL,
        service: MONSTER_SERVICES.en[4], // "Not sure"
        quantity: 1,
        fileLink: '',
        description: `[AUTOMATED API TEST - please ignore] Backend check of the request form, ${new Date().toISOString()}.`,
      };
      const body = formApi.body(contract, details, 'en');
      await allure.attachment('request-body.json', JSON.stringify(body, null, 2), 'application/json');

      const { res, ms, json } = await formApi.submit(contract, body);
      await allure.attachment('response.json', JSON.stringify({ status: res.status(), ms, headers: res.headers(), body: json }, null, 2), 'application/json');
      await allure.parameter('Content-Type', res.headers()['content-type'] ?? '');
      await allure.parameter('Response time (ms)', String(ms));

      await test.step('HTTP layer: 200, CORS, reasonable time, JSON body', async () => {
        expect.soft(res.status()).toBe(200);
        expect.soft(res.headers()['access-control-allow-origin']).toBeTruthy();
        expect.soft(ms, 'response time in ms').toBeLessThan(10_000);
        // FormSubmit labels the reply text/html even though the body is JSON; what matters is that it parses.
        expect(json, `body is JSON (Content-Type: ${res.headers()['content-type']})`).not.toBeNull();
      });

      await test.step('Body: exactly the documented success response', async () => {
        // FormSubmit explains failures (e.g. "This form needs Activation") in body.message.
        expect(json, `FormSubmit said: ${json?.message}`).toEqual(FORMSUBMIT_SUCCESS);
      });

      await test.step('What the page relies on: success === "true" (string)', async () => {
        // script.js accepts success === true or 'true'; FormSubmit currently sends the string.
        expect(typeof json!.success).toBe('string');
        expect(json!.success === true || json!.success === 'true').toBe(true);
      });
    });

    test('rejects a submission that does not come from a web page', async ({ formApi }) => {
      await allure.description(
        'FormSubmit only accepts posts that name the page they were sent from (Referer header). ' +
          'This guards against scripted spam. A rejected post sends no email.',
      );
      const contract = await formApi.contract('en');
      const body = formApi.body(contract, {
        name: 'Playwright API Test (should be rejected)',
        email: REAL_SUBMIT_EMAIL,
        service: MONSTER_SERVICES.en[4],
        description: '[AUTOMATED API TEST - please ignore] This post has no Referer and must be rejected.',
      });

      const { res, json } = await formApi.submit(contract, body, { fromPage: false });
      await allure.attachment('response.json', JSON.stringify({ status: res.status(), body: json }, null, 2), 'application/json');

      expect(json?.success, 'not accepted').not.toBe('true');
      expect(String(json?.message)).toContain('web server');
    });
  });
});
