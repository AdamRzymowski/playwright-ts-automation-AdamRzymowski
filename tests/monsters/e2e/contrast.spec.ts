import AxeBuilder from '@axe-core/playwright';
import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { createPrintRequest } from '../../utils/testData';
import { formatViolations } from '../../utils/a11y';

// Readability: is every piece of text clearly visible against what is behind it?
// Uses axe-core's colour-contrast check (WCAG 1.4.3): at least 4.5:1 for normal text, 3:1 for large text.
// It works out the real background behind each piece of text (including parent boxes and overlays).
// Text over photos/gradients can't be measured automatically; those are listed as "check by eye".
// Runs in both desktop and mobile view, and covers states such as error badges and messages.

async function checkContrast(page: import('@playwright/test').Page, name: string, include?: string) {
  let builder = new AxeBuilder({ page }).withRules(['color-contrast']);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();

  const checked = results.passes.flatMap((r) => r.nodes).length;
  const unsure = results.incomplete.flatMap((r) => r.nodes);
  const summary = [
    `${name}: ${checked} text elements readable, ${results.violations.flatMap((v) => v.nodes).length} too faint, ${unsure.length} to check by eye`,
    '',
    formatViolations(results.violations),
    '',
    'Check by eye (text over images or gradients):',
    unsure.map((n) => `  ${n.target.join(' ')}: ${n.any[0]?.message ?? ''}`).join('\n') || '  none',
  ].join('\n');
  await allure.attachment(`contrast - ${name}.txt`, summary, 'text/plain');

  expect(results.violations.flatMap((v) => v.nodes.map((n) => n.target.join(' '))), formatViolations(results.violations)).toEqual([]);
}

test.describe('Text colour contrast (readability)', () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Readability');
  });

  test('English page: all text is readable', { tag: ['@smoke'] }, async ({ page, site }) => {
    await allure.severity(allure.Severity.CRITICAL);
    await site.goto();
    await checkContrast(page, 'English page');
  });

  test('Polish page: all text is readable', async ({ page, sitePl }) => {
    await sitePl.goto();
    await checkContrast(page, 'Polish page');
  });

  test('open menu is readable', async ({ page, site }) => {
    await site.goto();
    await site.openMenuIfCollapsed();
    await expect(site.navLink('gallery')).toBeVisible();
    await checkContrast(page, 'header and menu', '[data-testid="header"]');
  });

  for (const tab of ['resin', 'fdm', 'design', 'painting'] as const) {
    test(`gallery tab "${tab}" and captions are readable`, async ({ page, site }) => {
      await site.goto('#gallery');
      await site.tab(tab).click();
      await checkContrast(page, `gallery ${tab}`, '[data-testid="gallery"]');
    });
  }

  test('enlarged photo caption is readable', async ({ page, site }) => {
    await site.goto('#gallery');
    await site.tab('painting').click();
    await site.visibleGallery().locator('.gallery-item').first().click();
    await expect(site.lightbox).toBeVisible();
    await checkContrast(page, 'lightbox', '[data-testid="lightbox"]');
  });

  test('form error badges and the red message are readable', async ({ page, site }) => {
    await allure.severity(allure.Severity.CRITICAL);
    await page.route(FORMSUBMIT, (route) => route.abort());
    await site.goto('#contact');
    await site.submitButton.click();
    await expect(site.formStatus).toHaveText(site.labels.fix);
    await expect(site.fieldError('Name')).toBeVisible();
    await checkContrast(page, 'form with error badges', '[data-testid="request-form"]');
  });

  test('form "Sending…" and thank-you messages are readable', async ({ page, site }) => {
    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    await page.route(FORMSUBMIT, async (route) => {
      await held;
      await route.fulfill({ json: { success: 'true' } });
    });
    await site.goto('#contact');
    await site.fillRequest(createPrintRequest());
    await site.submitButton.click();

    await test.step('Sending…', async () => {
      await expect(site.formStatus).toHaveText(site.labels.sending);
      await checkContrast(page, 'form sending', '[data-testid="request-form"]');
    });

    await test.step('Thank-you message', async () => {
      release();
      await expect(site.formStatus).toHaveText(site.labels.ok);
      await checkContrast(page, 'form sent', '[data-testid="request-form"]');
    });
  });

  test('description counter warning is readable', async ({ page, site }) => {
    await site.goto('#contact');
    await site.field('Description').fill('x'.repeat(950));
    await expect(site.descriptionCounter).toHaveClass(/near-limit/);
    await checkContrast(page, 'counter near limit', '[data-testid="request-form"]');
  });
});
