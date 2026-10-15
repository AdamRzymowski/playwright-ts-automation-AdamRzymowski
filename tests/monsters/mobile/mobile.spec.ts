import * as allure from 'allure-js-commons';
import { test, expect } from '../../../fixtures/monsters';
import type { MonstersPage } from '../../../pages/monsters/MonstersPage';

test.describe('Mobile view', () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Mobile layout');
  });

  test('menu is collapsed behind the hamburger button', { tag: ['@smoke'] }, async ({ site }) => {
    await allure.severity(allure.Severity.CRITICAL);
    await site.goto();

    await expect(site.menuButton).toBeVisible();
    await expect(site.menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(site.navLink('gallery')).toBeHidden();
  });

  test('tapping the hamburger opens the menu and a link closes it', async ({ page, site }) => {
    await site.goto();

    await site.menuButton.tap();
    await expect(site.menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(site.navLink('gallery')).toBeVisible();

    await site.navLink('gallery').tap();
    await expect(page).toHaveURL(/#gallery$/);
    await expect(site.navLink('gallery')).toBeHidden();
    await expect(site.section('gallery')).toBeInViewport();
  });

  for (const lang of ['en', 'pl'] as const) {
    test(`no sideways scrolling (${lang})`, async ({ page, site, sitePl }) => {
      const s: MonstersPage = lang === 'en' ? site : sitePl;
      await s.goto();

      const { scrollWidth, innerWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    });
  }

  test('gallery tabs and lightbox work with taps', async ({ page, site }) => {
    await site.goto('#gallery');

    await site.tab('painting').tap();
    await site.tab('terrain').tap();
    await expect(site.visibleGallery()).toHaveAttribute('data-gallery', 'terrain');

    const photo = site.visibleGallery().locator('.gallery-item').first();
    await photo.tap();
    await expect(site.lightbox).toBeVisible();
    // The enlarged photo must fit on the phone screen.
    const box = await site.lightboxImage.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);

    await site.lightboxClose.tap();
    await expect(site.lightbox).toBeHidden();
  });
});
