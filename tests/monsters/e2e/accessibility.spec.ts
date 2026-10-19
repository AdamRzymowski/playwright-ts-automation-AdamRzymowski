import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { createPrintRequest } from '../../utils/testData';
import { formatViolations, scanWcag } from '../../utils/a11y';

// Automated WCAG 2.2 A/AA checks with axe-core, plus keyboard checks axe cannot do on its own.
// Automated tools find roughly a third to a half of accessibility problems; a manual review is still needed.

test.describe('Accessibility (WCAG 2.2 AA)', { tag: '@a11y' }, () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Accessibility');
    await allure.tag('a11y');
  });

  test.describe('Automated scan', () => {
    test.beforeEach(async () => {
      await allure.story('axe-core scan');
    });

    test('English page has no WCAG violations', { tag: ['@smoke'] }, async ({ page, site }) => {
      await allure.severity(allure.Severity.CRITICAL);
      await site.goto();
      const violations = await scanWcag(page, 'English page');
      expect(violations.map((v) => v.id), formatViolations(violations)).toEqual([]);
    });

    test('Polish page has no WCAG violations', async ({ page, sitePl }) => {
      await sitePl.goto();
      const violations = await scanWcag(page, 'Polish page');
      expect(violations.map((v) => v.id), formatViolations(violations)).toEqual([]);
    });

    test('Miniatures and Terrain gallery has no WCAG violations', async ({ page, site }) => {
      await site.goto('#gallery');
      await site.tab('painting').click();
      const violations = await scanWcag(page, 'painting gallery', { include: '[data-testid="gallery"]' });
      expect(violations.map((v) => v.id), formatViolations(violations)).toEqual([]);
    });

    test('Enlarged photo view has no WCAG violations', async ({ page, site }) => {
      await site.goto('#gallery');
      await site.visibleGallery().locator('.gallery-item').first().click();
      await expect(site.lightbox).toBeVisible();
      const violations = await scanWcag(page, 'lightbox', { include: '[data-testid="lightbox"]' });
      expect(violations.map((v) => v.id), formatViolations(violations)).toEqual([]);
    });

    test('Form error state has no WCAG violations', async ({ page, site }) => {
      await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'false', message: 'Test error' } }));
      await site.goto('#contact');
      await site.fillRequest(createPrintRequest());
      await site.submitButton.click();
      await expect(site.formStatus).toContainText(site.labels.err);
      const violations = await scanWcag(page, 'form error state', { include: '[data-testid="contact"]' });
      expect(violations.map((v) => v.id), formatViolations(violations)).toEqual([]);
    });

    test('Form success state has no WCAG violations', async ({ page, site }) => {
      await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'true' } }));
      await site.goto('#contact');
      await site.fillRequest(createPrintRequest());
      await site.submitButton.click();
      await expect(site.formStatus).toHaveText(site.labels.ok);
      const violations = await scanWcag(page, 'form success state', { include: '[data-testid="contact"]' });
      expect(violations.map((v) => v.id), formatViolations(violations)).toEqual([]);
    });
  });

  test.describe('Keyboard and screen reader', () => {
    test.beforeEach(async () => {
      await allure.story('Keyboard and screen reader');
    });

    test('Pages declare their language', async ({ page, site, sitePl }) => {
      await site.goto();
      await expect.soft(page.locator('html')).toHaveAttribute('lang', 'en');
      await sitePl.goto();
      await expect.soft(page.locator('html')).toHaveAttribute('lang', 'pl');
    });

    test('Form fields have screen reader labels', async ({ page, site }) => {
      await site.goto('#contact');
      const labels: Record<string, RegExp> = {
        'form-name': /Your name/,
        'form-email': /Email/,
        'form-service': /Service/,
        'form-quantity': /Quantity/,
        'form-file-link': /Link to your file/,
        'form-description': /Describe what you need/,
      };
      for (const [testId, name] of Object.entries(labels)) {
        await expect.soft(page.getByTestId(testId), testId).toHaveAccessibleName(name);
      }
    });

    test('Form can be completed with the keyboard only', async ({ page, site }) => {
      await allure.severity(allure.Severity.CRITICAL);
      await page.route(FORMSUBMIT, (route) => route.fulfill({ json: { success: 'true' } }));
      await site.goto('#contact');
      const request = createPrintRequest({ service: 'FDM print' });

      await site.field('Name').focus();
      await page.keyboard.type(request.name);
      await page.keyboard.press('Tab');
      await expect(site.field('email')).toBeFocused();
      await page.keyboard.type(request.email);
      await page.keyboard.press('Tab');
      await expect(site.field('Service')).toBeFocused();
      await site.field('Service').selectOption(request.service); // keyboard users pick with arrow keys
      await page.keyboard.press('Tab');
      await expect(site.field('Quantity')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(site.field('File link')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(site.field('Description')).toBeFocused();
      await page.keyboard.type(request.description);
      await page.keyboard.press('Tab');
      await expect(site.submitButton).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(site.formStatus).toHaveText(site.labels.ok);
    });

    test('Focused fields show a visible outline', async ({ page, site }) => {
      await site.goto('#contact');
      await site.field('Name').focus();
      await page.keyboard.press('Tab');

      const outline = await site.field('email').evaluate((el) => {
        const s = getComputedStyle(el);
        return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
      });
      expect(outline.style).not.toBe('none');
      expect(outline.width).toBeGreaterThan(0);
    });

    test('Gallery tabs work with the keyboard', async ({ page, site }) => {
      await site.goto('#gallery');
      await site.tab('fdm').focus();
      await page.keyboard.press('Enter');
      await expect(site.visibleGallery()).toHaveAttribute('data-gallery', 'fdm');
    });

    test('Gallery photos open with the keyboard', async ({ page, site }) => {
      await allure.description(
        'A keyboard-only visitor must be able to open the enlarged photo. The photos are <figure> elements ' +
          'with a click handler, so they need tabindex="0" (or a <button>) and an Enter/Space handler.',
      );
      await site.goto('#gallery');
      const photo = site.visibleGallery().locator('.gallery-item').first();

      const focusable = await photo.evaluate((el) => {
        (el as HTMLElement).focus();
        return document.activeElement === el || el.contains(document.activeElement);
      });
      expect(focusable, 'gallery photo can receive keyboard focus').toBe(true);
      await page.keyboard.press('Enter');
      await expect(site.lightbox).toBeVisible();
    });

    test('Enlarged photo closes with Escape and has a labelled close button', async ({ page, site }) => {
      await site.goto('#gallery');
      await site.visibleGallery().locator('.gallery-item').first().click();

      await expect(site.lightboxClose).toHaveAccessibleName(/Close/);
      await expect(site.lightboxImage).toHaveAttribute('alt', /\S/);
      await page.keyboard.press('Escape');
      await expect(site.lightbox).toBeHidden();
    });
  });
});
