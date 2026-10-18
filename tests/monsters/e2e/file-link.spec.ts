import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { createPrintRequest } from '../../utils/testData';
import { parseMultipart } from '../../utils/multipart';

// "Link to your file or reference photos" (optional field, name "File link").
// Rule tested here: if a link is given, it must be a web address starting with http:// or https://
// and have a site name; it is sent exactly as typed.
// NOTE: as of site v1.6.0 the field is plain text and only its length is checked, so the
// "malformed links are flagged" tests fail until the site adds a link check (findings, like the
// accessibility failures).

const VALID_LINKS = {
  Thingiverse: 'https://www.thingiverse.com/thing:2187167',
  Printables: 'https://www.printables.com/model/3161-3d-benchy',
  'Google Drive (with query)': 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz/view?usp=sharing',
  'Dropbox (with ?dl=0)': 'https://www.dropbox.com/scl/fi/abc123/dragon.stl?rlkey=xyz789&dl=0',
  'with a #section': 'https://www.myminifactory.com/object/3d-print-dragon-12345#comments',
  'http (not https)': 'http://example.com/models/dragon.3mf',
  'encoded space': 'https://example.com/my%20files/dragon%20v2.stl',
};

const MALFORMED_LINKS = {
  'plain text': 'my dragon file',
  'typo in http': 'htp://www.thingiverse.com/thing:123',
  'scheme only': 'https://',
  'javascript link': 'javascript:alert(document.cookie)',
  'missing slashes': 'https:www.printables.com/model/1',
  'spaces inside': 'https://www.printables.com/model/1 2 3',
};

test.describe('Request form: file link format', () => {
  test.beforeEach(async ({ site }) => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Request a print');
    await allure.story('File link format');
    await site.goto('#contact');
  });

  test('field is optional and has a helpful placeholder', async ({ page, site }) => {
    await expect(site.field('File link')).not.toHaveAttribute('required');
    await expect(site.field('File link')).toHaveAttribute('placeholder', /Thingiverse|Printables|Drive|Dropbox/);

    // A request without a link is sent normally.
    let sent: Record<string, string> = {};
    await page.route(FORMSUBMIT, async (route) => {
      sent = parseMultipart(route.request().postDataBuffer());
      await route.fulfill({ json: { success: 'true' } });
    });
    await site.fillRequest(createPrintRequest({ fileLink: '' }));
    await site.submitButton.click();
    await expect(site.formStatus).toHaveText(site.labels.ok);
    expect(sent['File link']).toBe('');
  });

  for (const [kind, link] of Object.entries(VALID_LINKS)) {
    test(`accepts a ${kind} link and sends it unchanged`, async ({ page, site }) => {
      let sent: Record<string, string> = {};
      await page.route(FORMSUBMIT, async (route) => {
        sent = parseMultipart(route.request().postDataBuffer());
        await route.fulfill({ json: { success: 'true' } });
      });

      await site.fillRequest(createPrintRequest({ fileLink: link }));
      await site.submitButton.click();

      await expect(site.formStatus).toHaveText(site.labels.ok);
      await expect(site.fieldError('File link')).toHaveCount(0);
      expect(sent['File link']).toBe(link);
      // Sanity check of the test data itself: a real http(s) web address.
      expect(new URL(link).protocol).toMatch(/^https?:$/);
    });
  }

  for (const [kind, link] of Object.entries(MALFORMED_LINKS)) {
    test(`flags a malformed link: ${kind}`, async ({ page, site }) => {
      await allure.description(
        'Expected: the form marks the link field (red badge, aria-invalid) and does not send. ' +
          'Fails while the site accepts any text in this field (v1.6.0).',
      );
      let calls = 0;
      await page.route(FORMSUBMIT, (route) => {
        calls++;
        return route.fulfill({ json: { success: 'true' } });
      });

      await site.fillRequest(createPrintRequest({ fileLink: link }));
      await site.submitButton.click();

      await expect.soft(site.fieldError('File link'), 'link field shows a problem badge').toBeVisible();
      await expect.soft(site.field('File link')).toHaveAttribute('aria-invalid', 'true');
      expect(calls, 'malformed link must not be sent').toBe(0);
    });
  }
});
