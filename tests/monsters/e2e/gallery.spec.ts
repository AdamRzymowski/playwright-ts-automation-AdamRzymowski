import * as allure from 'allure-js-commons';
import { test, expect } from '../../../fixtures/monsters';
import type { GalleryName } from '../../../pages/monsters/MonstersPage';

const TOP_TABS: GalleryName[] = ['resin', 'fdm', 'design'];

test.describe('Gallery', () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Gallery');
  });

  test('Resin gallery is shown by default', async ({ site }) => {
    await site.goto();

    await expect(site.gallery.tab('resin')).toHaveClass(/\bactive\b/);
    await expect(site.gallery.panels.filter({ visible: true })).toHaveCount(1);
    await expect(site.gallery.panel('resin')).toBeVisible();
    await expect(site.gallery.subtabRow).toBeHidden();
  });

  test('Each gallery tab shows only its own photos', { tag: ['@smoke'] }, async ({ site }) => {
    await allure.severity(allure.Severity.CRITICAL);
    await site.goto();

    for (const name of TOP_TABS) {
      await test.step(`open ${name}`, async () => {
        await site.gallery.tab(name).click();
        await expect.soft(site.gallery.tab(name)).toHaveClass(/\bactive\b/);
        await expect.soft(site.gallery.activeTab).toHaveCount(1);
        await expect.soft(site.gallery.visiblePanel()).toHaveAttribute('data-gallery', name);
        await expect.soft(site.gallery.visibleItems()).not.toHaveCount(0);
      });
    }
  });

  test('Miniatures and Terrain tab remembers the last sub-tab', async ({ site }) => {
    await site.goto();

    await test.step('painting opens Miniatures first', async () => {
      await site.gallery.tab('painting').click();
      await expect(site.gallery.subtabRow).toBeVisible();
      await expect(site.gallery.tab('miniatures')).toHaveClass(/\bactive\b/);
      await expect(site.gallery.visiblePanel()).toHaveAttribute('data-gallery', 'miniatures');
    });

    await test.step('switch to Terrain', async () => {
      await site.gallery.tab('terrain').click();
      await expect(site.gallery.tab('painting')).toHaveClass(/\bactive\b/);
      await expect(site.gallery.tab('terrain')).toHaveClass(/\bactive\b/);
      await expect(site.gallery.visiblePanel()).toHaveAttribute('data-gallery', 'terrain');
    });

    await test.step('leave and come back: Terrain is still selected', async () => {
      await site.gallery.tab('fdm').click();
      await expect(site.gallery.subtabRow).toBeHidden();
      await site.gallery.tab('painting').click();
      await expect(site.gallery.visiblePanel()).toHaveAttribute('data-gallery', 'terrain');
    });
  });

  for (const name of ['resin', 'fdm', 'design', 'painting'] as GalleryName[]) {
    test(`Service card "${name}" opens its gallery`, async ({ page, site }) => {
      await site.goto();
      await site.serviceCard(name).click();

      const expected = name === 'painting' ? 'miniatures' : name;
      await expect(site.gallery.visiblePanel()).toHaveAttribute('data-gallery', expected);
      await expect(page).toHaveURL(new RegExp(`#gallery-${name}$`));
      await expect(site.section('gallery')).toBeInViewport();
    });
  }

  test('Link to #gallery-fdm opens the FDM gallery', async ({ site }) => {
    await site.goto('#gallery-fdm');

    await expect(site.gallery.tab('fdm')).toHaveClass(/\bactive\b/);
    await expect(site.gallery.visiblePanel()).toHaveAttribute('data-gallery', 'fdm');
    await expect(site.section('gallery')).toBeInViewport();
  });

  test('Every gallery photo has alt text and a caption', async ({ site }) => {
    await site.goto();
    const items = site.gallery.allItems;
    const count = await items.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      await expect.soft(site.gallery.imageOf(item)).toHaveAttribute('alt', /\S/);
      await expect.soft(site.gallery.captionOf(item)).not.toBeEmpty();
    }
  });

  test.describe('Lightbox', () => {
    test.beforeEach(async () => {
      await allure.story('Lightbox');
    });

    test('Clicking a photo enlarges it with its caption', async ({ site }) => {
      // Miniatures has many photos; the default Resin gallery may hold only one.
      await site.goto('#gallery');
      await site.gallery.tab('painting').click();
      const item = site.gallery.items('miniatures').nth(1);
      const src = await site.gallery.imageOf(item).getAttribute('src');
      const caption = await site.gallery.captionOf(item).textContent();

      await item.click();

      await expect(site.lightbox.root).toBeVisible();
      await expect(site.lightbox.image).toHaveAttribute('src', new RegExp(`${src}$`));
      await expect(site.lightbox.caption).toHaveText(caption!);
    });

    test('Enlarged photo closes with Escape, × or backdrop', async ({ page, site }) => {
      await site.goto();
      const first = site.gallery.items('resin').first();

      await test.step('Escape', async () => {
        await first.click();
        await page.keyboard.press('Escape');
        await expect(site.lightbox.root).toBeHidden();
      });

      await test.step('close button', async () => {
        await first.click();
        await site.lightbox.closeButton.click();
        await expect(site.lightbox.root).toBeHidden();
      });

      await test.step('clicking the photo keeps it open', async () => {
        await first.click();
        await site.lightbox.image.click();
        await expect(site.lightbox.root).toBeVisible();
      });

      await test.step('backdrop', async () => {
        await site.lightbox.root.click({ position: { x: 10, y: 10 } });
        await expect(site.lightbox.root).toBeHidden();
      });
    });
  });
});
