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
    await site.form.fill(createPrintRequest());
    await site.form.submitButton.click();
  }

  test('Success pop-up appears with the right content', { tag: ['@smoke'] }, async ({ page, site }) => {
    await allure.severity(allure.Severity.CRITICAL);
    await expect(site.dialog.root).toBeHidden();

    await sendSuccessfully(page, site);

    await test.step('pop-up is shown with title, text and buttons', async () => {
      await expect(site.dialog.root).toBeVisible();
      await expect(site.dialog.root).toHaveJSProperty('open', true);
      await expect.soft(site.dialog.title).toHaveText(site.labels.dialog.title);
      await expect.soft(site.dialog.text).toHaveText(site.labels.dialog.text);
      await expect.soft(site.dialog.closeButton).toHaveText(site.labels.dialog.close);
      await expect.soft(site.dialog.xButton).toHaveAccessibleName(site.labels.dialog.x);
    });

    await test.step('the form behind it is cleared and confirms too', async () => {
      await expect.soft(site.form.status).toHaveText(site.labels.ok);
      await expect.soft(site.form.field('Name')).toHaveValue('');
      await expect.soft(site.form.field('Description')).toHaveValue('');
    });
  });

  test('Success pop-up takes focus and blocks the page behind', async ({ page, site }) => {
    await sendSuccessfully(page, site);
    await expect(site.dialog.root).toBeVisible();

    await expect(site.dialog.closeButton).toBeFocused();
    await expect(site.dialog.root).toHaveAttribute('aria-labelledby', 'success-title');
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
    test(`Success pop-up closes with the ${how === 'button' ? '"Great, thanks" button' : how === 'x' ? '× button' : how === 'escape' ? 'Escape key' : 'dark backdrop'}`, async ({ page, site }) => {
      await sendSuccessfully(page, site);
      await expect(site.dialog.root).toBeVisible();

      if (how === 'button') await site.dialog.closeButton.click();
      if (how === 'x') await site.dialog.xButton.click();
      if (how === 'escape') await page.keyboard.press('Escape');
      if (how === 'backdrop') await page.mouse.click(5, 5); // outside the dialog box

      await expect(site.dialog.root).toBeHidden();
      // The page can be used again.
      await site.form.field('Name').fill('Next request');
      await expect(site.form.field('Name')).toHaveValue('Next request');
    });
  }

  test('Success pop-up stays open when clicked inside', async ({ page, site }) => {
    await sendSuccessfully(page, site);
    await site.dialog.text.click();
    await expect(site.dialog.root).toBeVisible();
  });

  test('Success pop-up does not appear on errors', async ({ page, site }) => {
    await test.step('form with errors', async () => {
      await page.route(FORMSUBMIT, (route) => route.abort());
      await site.form.submitButton.click();
      await expect(site.form.status).toHaveText(site.labels.fix);
      await expect(site.dialog.root).toBeHidden();
      await page.unroute(FORMSUBMIT);
    });

    await test.step('FormSubmit rejects the request', async () => {
      await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'false', message: 'This form needs Activation.' } }));
      await site.form.fill(createPrintRequest());
      await site.form.submitButton.click();
      await expect(site.form.status).toContainText(site.labels.err);
      await expect(site.dialog.root).toBeHidden();
      await page.unroute(FORMSUBMIT);
    });

    await test.step('network failure', async () => {
      await page.route(FORMSUBMIT, (route) => route.abort('internetdisconnected'));
      await site.form.submitButton.click();
      await expect(site.form.status).toContainText(site.labels.err);
      await expect(site.dialog.root).toBeHidden();
    });
  });

  test('Success pop-up appears again for a second request', async ({ page, site }) => {
    await sendSuccessfully(page, site);
    await site.dialog.closeButton.click();
    await expect(site.dialog.root).toBeHidden();

    await site.form.fill(createPrintRequest());
    await site.form.submitButton.click();
    await expect(site.dialog.root).toBeVisible();
  });

  test('Success pop-up fits the screen and is readable', async ({ page, site }) => {
    await sendSuccessfully(page, site);
    await expect(site.dialog.root).toBeVisible();

    const box = await site.dialog.root.boundingBox();
    const viewport = page.viewportSize()!;
    expect.soft(box!.x, 'left edge on screen').toBeGreaterThanOrEqual(0);
    expect.soft(box!.x + box!.width, 'right edge on screen').toBeLessThanOrEqual(viewport.width);
    await expect.soft(site.dialog.closeButton).toBeInViewport();

    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).include('[data-testid="success-dialog"]').analyze();
    expect(results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))), formatViolations(results.violations)).toEqual([]);
  });

  test('Success pop-up is in Polish on the Polish page', async ({ page, sitePl }) => {
    await sitePl.goto('#contact');
    await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'true' } }));
    await sitePl.form.fill(createPrintRequest({ service: 'Druk FDM' }));
    await sitePl.form.submitButton.click();

    await expect(sitePl.dialog.root).toBeVisible();
    await expect.soft(sitePl.dialog.title).toHaveText(sitePl.labels.dialog.title);
    await expect.soft(sitePl.dialog.text).toHaveText(sitePl.labels.dialog.text);
    await expect.soft(sitePl.dialog.closeButton).toHaveText(sitePl.labels.dialog.close);
    await expect.soft(sitePl.dialog.xButton).toHaveAccessibleName(sitePl.labels.dialog.x);
  });
});
