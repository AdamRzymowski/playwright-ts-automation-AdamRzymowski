import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { createPrintRequest } from '../../utils/testData';
import { parseMultipart } from '../../utils/multipart';

// "Link to your file or reference photos" (optional field, name "File link").
// Rule (site v1.6.1+): if links are given (several may be separated by spaces, commas or new lines), each
// must be a web address with a real-looking site name (name.com); "https://" is optional. Links are sent
// exactly as typed. Anything else gets the badge "Enter a valid link" and is not sent.
// (Up to v1.6.0 any text was accepted: KNOWN-ISSUES.md KI-003.)

const VALID_LINKS = {
  'a Thingiverse link': 'https://www.thingiverse.com/thing:2187167',
  'a Printables link': 'https://www.printables.com/model/3161-3d-benchy',
  'a Google Drive link with a query': 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing',
  'a Dropbox link with ?dl=0': 'https://www.dropbox.com/scl/fi/abc123/dragon.stl?rlkey=xyz789&dl=0',
  'a link with a #section': 'https://www.myminifactory.com/object/3d-print-dragon-12345#comments',
  'an http link': 'http://example.com/models/dragon.3mf',
  'a link with an encoded space': 'https://example.com/my%20files/dragon%20v2.stl',
  'a link without https://': 'drive.google.com/file/d/1AbCdEf/view',
  'two links': 'https://www.thingiverse.com/thing:2187167, https://www.printables.com/model/3161-3d-benchy',
};

const MALFORMED_LINKS = {
  'plain text': 'my dragon file',
  'a typo in http': 'htp://www.thingiverse.com/thing:123',
  'a scheme with no address': 'https://',
  'a javascript: link': 'javascript:alert(document.cookie)',
  'missing slashes': 'https:www.printables.com/model/1',
  'spaces inside a link': 'https://www.printables.com/model/1 2 3',
};

test.describe('Request form: file link format', () => {
  test.beforeEach(async ({ site }) => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Request a print');
    await allure.story('File link format');
    await site.goto('#contact');
  });

  test('File link field is optional with a helpful placeholder', async ({ page, site }) => {
    await expect(site.form.field('File link')).not.toHaveAttribute('required');
    await expect(site.form.field('File link')).toHaveAttribute('placeholder', /Thingiverse|Printables|Drive|Dropbox/);

    // A request without a link is sent normally.
    let sent: Record<string, string> = {};
    await page.route(FORMSUBMIT, async (route) => {
      sent = parseMultipart(route.request().postDataBuffer());
      await route.fulfill({ json: { success: 'true' } });
    });
    await site.form.fill(createPrintRequest({ fileLink: '' }));
    await site.form.submitButton.click();
    await expect(site.form.status).toHaveText(site.labels.ok);
    expect(sent['File link']).toBe('');
  });

  for (const [kind, link] of Object.entries(VALID_LINKS)) {
    test(`File link accepts ${kind} unchanged`, async ({ page, site }) => {
      let sent: Record<string, string> = {};
      await page.route(FORMSUBMIT, async (route) => {
        sent = parseMultipart(route.request().postDataBuffer());
        await route.fulfill({ json: { success: 'true' } });
      });

      await site.form.fill(createPrintRequest({ fileLink: link }));
      await site.form.submitButton.click();

      await expect(site.form.status).toHaveText(site.labels.ok);
      await expect(site.form.fieldError('File link')).toHaveCount(0);
      expect(sent['File link']).toBe(link);
      // Sanity check of the test data itself: each part is a real http(s) web address (scheme optional).
      for (const part of link.split(/[\s,]+/).filter(Boolean)) {
        expect(new URL(/^https?:\/\//.test(part) ? part : `https://${part}`).protocol).toMatch(/^https?:$/);
      }
    });
  }

  for (const [kind, link] of Object.entries(MALFORMED_LINKS)) {
    test(`File link rejects ${kind}`, async ({ page, site }) => {
      await allure.description(
        'The form marks the link field with "Enter a valid link" and does not send (fixed in v1.6.1, KI-003).',
      );
      let calls = 0;
      await page.route(FORMSUBMIT, (route) => {
        calls++;
        return route.fulfill({ json: { success: 'true' } });
      });

      await site.form.fill(createPrintRequest({ fileLink: link }));
      await site.form.submitButton.click();

      await expect.soft(site.form.fieldError('File link'), 'link field shows a problem badge').toHaveText(site.labels.badges.link);
      await expect.soft(site.form.field('File link')).toHaveAttribute('aria-invalid', 'true');
      expect(calls, 'malformed link must not be sent').toBe(0);
    });
  }
});
