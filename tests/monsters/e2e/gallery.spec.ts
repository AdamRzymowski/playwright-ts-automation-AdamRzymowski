import * as allure from 'allure-js-commons';
import { test, expect } from '../../../fixtures/monsters';
import type { GalleryName } from '../../../pages/monsters/MonstersPage';

const TOP_TABS: GalleryName[] = ['resin', 'fdm', 'design'];

test.describe('Gallery', () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Gallery');
  });

  test('resin gallery is shown by default', async ({ site }) => {
    await site.goto();

    await expect(site.tab('resin')).toHaveClass(/\bactive\b/);
    await expect(site.galleries.filter({ visible: true })).toHaveCount(1);
    await expect(site.gallery('resin')).toBeVisible();
    await expect(site.subtabRow).toBeHidden();
  });

  test('each tab shows only its own gallery', { tag: ['@smoke'] }, async ({ site }) => {
    await allure.severity(allure.Severity.CRITICAL);
    await site.goto();

    for (const name of TOP_TABS) {
      await test.step(`open ${name}`, async () => {
        await site.tab(name).click();
        await expect.soft(site.tab(name)).toHaveClass(/\bactive\b/);
        await expect.soft(site.tabs.and(site.page.locator('.active'))).toHaveCount(1);
        await expect.soft(site.visibleGallery()).toHaveAttribute('data-gallery', name);
        await expect.soft(site.visibleGallery().locator('.gallery-item')).not.toHaveCount(0);
      });
    }
  });

  test('painting tab opens sub-tabs and remembers the last one', async ({ site }) => {
    await site.goto();

    await test.step('painting opens Miniatures first', async () => {
      await site.tab('painting').click();
      await expect(site.subtabRow).toBeVisible();
      await expect(site.tab('miniatures')).toHaveClass(/\bactive\b/);
      await expect(site.visibleGallery()).toHaveAttribute('data-gallery', 'miniatures');
    });

    await test.step('switch to Terrain', async () => {
      await site.tab('terrain').click();
      await expect(site.tab('painting')).toHaveClass(/\bactive\b/);
      await expect(site.tab('terrain')).toHaveClass(/\bactive\b/);
      await expect(site.visibleGallery()).toHaveAttribute('data-gallery', 'terrain');
    });

    await test.step('leave and come back: Terrain is still selected', async () => {
      await site.tab('fdm').click();
      await expect(site.subtabRow).toBeHidden();
      await site.tab('painting').click();
      await expect(site.visibleGallery()).toHaveAttribute('data-gallery', 'terrain');
    });
  });

  for (const name of ['resin', 'fdm', 'design', 'painting'] as GalleryName[]) {
    test(`service card "${name}" opens its gallery`, async ({ page, site }) => {
      await site.goto();
      await site.serviceCard(name).click();

      const expected = name === 'painting' ? 'miniatures' : name;
      await expect(site.visibleGallery()).toHaveAttribute('data-gallery', expected);
      await expect(page).toHaveURL(new RegExp(`#gallery-${name}$`));
      await expect(site.section('gallery')).toBeInViewport();
    });
  }

  test('deep link #gallery-fdm opens the FDM gallery', async ({ site }) => {
    await site.goto('#gallery-fdm');

    await expect(site.tab('fdm')).toHaveClass(/\bactive\b/);
    await expect(site.visibleGallery()).toHaveAttribute('data-gallery', 'fdm');
    await expect(site.section('gallery')).toBeInViewport();
  });

  test('every photo has alt text and a caption', async ({ site }) => {
    await site.goto();
    const items = site.page.locator('.gallery-item');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      await expect.soft(item.locator('img')).toHaveAttribute('alt', /\S/);
      await expect.soft(item.locator('figcaption')).not.toBeEmpty();
    }
  });

  test.describe('Lightbox', () => {
    test.beforeEach(async () => {
      await allure.story('Lightbox');
    });

    test('opens the clicked photo with its caption', async ({ site }) => {
      await site.goto();
      const item = site.gallery('resin').locator('.gallery-item').nth(1);
      const src = await item.locator('img').getAttribute('src');
      const caption = await item.locator('figcaption').textContent();

      await item.click();

      await expect(site.lightbox).toBeVisible();
      await expect(site.lightboxImage).toHaveAttribute('src', new RegExp(`${src}$`));
      await expect(site.lightboxCaption).toHaveText(caption!);
    });

    test('closes with Escape, the close button and the backdrop, but not the photo', async ({ page, site }) => {
      await site.goto();
      const first = site.gallery('resin').locator('.gallery-item').first();

      await test.step('Escape', async () => {
        await first.click();
        await page.keyboard.press('Escape');
        await expect(site.lightbox).toBeHidden();
      });

      await test.step('close button', async () => {
        await first.click();
        await site.lightboxClose.click();
        await expect(site.lightbox).toBeHidden();
      });

      await test.step('clicking the photo keeps it open', async () => {
        await first.click();
        await site.lightboxImage.click();
        await expect(site.lightbox).toBeVisible();
      });

      await test.step('backdrop', async () => {
        await site.lightbox.click({ position: { x: 10, y: 10 } });
        await expect(site.lightbox).toBeHidden();
      });
    });
  });
});
