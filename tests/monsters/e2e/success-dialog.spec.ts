import AxeBuilder from '@axe-core/playwright';
import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { createPrintRequest } from '../../utils/testData';
import { formatViolations } from '../../utils/a11y';

// Success pop-up (site v1.7.0+): a <dialog> shown after FormSubmit accepts a request.
// FormSubmit is mocked in every test here, so nothing is emailed.

test.describe('Request form: success pop-up', () => {
  test.beforeEach(async ({ site }) => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Request a print');
    await allure.story('Success pop-up');
    await site.goto('#contact');
  });

  /** Fills a valid request, answers it as FormSubmit would, and sends it. */
  async function sendSuccessfully(page: import('@playwright/test').Page, site: import('../../../pages/monsters/MonstersPage').MonstersPage) {
    await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'true', message: 'The form was submitted successfully.' } }));
    await site.fillRequest(createPrintRequest());
    await site.submitButton.click();
  }

  test('appears after a successful send with the right content', { tag: ['@smoke'] }, async ({ page, site }) => {
    await allure.severity(allure.Severity.CRITICAL);
    await expect(site.successDialog).toBeHidden();

    await sendSuccessfully(page, site);

    await test.step('pop-up is shown with title, text and buttons', async () => {
      await expect(site.successDialog).toBeVisible();
      await expect(site.successDialog).toHaveJSProperty('open', true);
      await expect.soft(site.successTitle).toHaveText(site.labels.dialog.title);
      await expect.soft(site.successText).toHaveText(site.labels.dialog.text);
      await expect.soft(site.successClose).toHaveText(site.labels.dialog.close);
      await expect.soft(site.successX).toHaveAccessibleName(site.labels.dialog.x);
    });

    await test.step('the form behind it is cleared and confirms too', async () => {
      await expect.soft(site.formStatus).toHaveText(site.labels.ok);
      await expect.soft(site.field('Name')).toHaveValue('');
      await expect.soft(site.field('Description')).toHaveValue('');
    });
  });

  test('is a proper modal: focus on its button, page behind not clickable', async ({ page, site }) => {
    await sendSuccessfully(page, site);
    await expect(site.successDialog).toBeVisible();

    await expect(site.successClose).toBeFocused();
    await expect(site.successDialog).toHaveAttribute('aria-labelledby', 'success-title');
    // With a modal dialog open, the rest of the page is inert.
    const inert = await page.evaluate(() => {
      const button = document.querySelector('[data-testid="form-submit"]') as HTMLElement;
      const rect = button.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return !button.contains(hit);
    });
    expect(inert, 'Send button is covered by the pop-up backdrop').toBe(true);
  });

  for (const how of ['button', 'x', 'escape', 'backdrop'] as const) {
    test(`closes with the ${how === 'button' ? '"Great, thanks" button' : how === 'x' ? '× button' : how === 'escape' ? 'Escape key' : 'dark backdrop'}`, async ({ page, site }) => {
      await sendSuccessfully(page, site);
      await expect(site.successDialog).toBeVisible();

      if (how === 'button') await site.successClose.click();
      if (how === 'x') await site.successX.click();
      if (how === 'escape') await page.keyboard.press('Escape');
      if (how === 'backdrop') await page.mouse.click(5, 5); // outside the dialog box

      await expect(site.successDialog).toBeHidden();
      // The page can be used again.
      await site.field('Name').fill('Next request');
      await expect(site.field('Name')).toHaveValue('Next request');
    });
  }

  test('stays open when clicking inside it', async ({ page, site }) => {
    await sendSuccessfully(page, site);
    await site.successText.click();
    await expect(site.successDialog).toBeVisible();
  });

  test('does not appear when sending fails or the form has errors', async ({ page, site }) => {
    await test.step('form with errors', async () => {
      await page.route(FORMSUBMIT, (route) => route.abort());
      await site.submitButton.click();
      await expect(site.formStatus).toHaveText(site.labels.fix);
      await expect(site.successDialog).toBeHidden();
      await page.unroute(FORMSUBMIT);
    });

    await test.step('FormSubmit rejects the request', async () => {
      await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'false', message: 'This form needs Activation.' } }));
      await site.fillRequest(createPrintRequest());
      await site.submitButton.click();
      await expect(site.formStatus).toContainText(site.labels.err);
      await expect(site.successDialog).toBeHidden();
      await page.unroute(FORMSUBMIT);
    });

    await test.step('network failure', async () => {
      await page.route(FORMSUBMIT, (route) => route.abort('internetdisconnected'));
      await site.submitButton.click();
      await expect(site.formStatus).toContainText(site.labels.err);
      await expect(site.successDialog).toBeHidden();
    });
  });

  test('appears again for a second request', async ({ page, site }) => {
    await sendSuccessfully(page, site);
    await site.successClose.click();
    await expect(site.successDialog).toBeHidden();

    await site.fillRequest(createPrintRequest());
    await site.submitButton.click();
    await expect(site.successDialog).toBeVisible();
  });

  test('fits on the screen and its text is readable', async ({ page, site }) => {
    await sendSuccessfully(page, site);
    await expect(site.successDialog).toBeVisible();

    const box = await site.successDialog.boundingBox();
    const viewport = page.viewportSize()!;
    expect.soft(box!.x, 'left edge on screen').toBeGreaterThanOrEqual(0);
    expect.soft(box!.x + box!.width, 'right edge on screen').toBeLessThanOrEqual(viewport.width);
    await expect.soft(site.successClose).toBeInViewport();

    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).include('[data-testid="success-dialog"]').analyze();
    expect(results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))), formatViolations(results.violations)).toEqual([]);
  });

  test('Polish page shows the pop-up in Polish', async ({ page, sitePl }) => {
    await sitePl.goto('#contact');
    await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'true' } }));
    await sitePl.fillRequest(createPrintRequest({ service: 'Druk FDM' }));
    await sitePl.submitButton.click();

    await expect(sitePl.successDialog).toBeVisible();
    await expect.soft(sitePl.successTitle).toHaveText(sitePl.labels.dialog.title);
    await expect.soft(sitePl.successText).toHaveText(sitePl.labels.dialog.text);
    await expect.soft(sitePl.successClose).toHaveText(sitePl.labels.dialog.close);
    await expect.soft(sitePl.successX).toHaveAccessibleName(sitePl.labels.dialog.x);
  });
});
