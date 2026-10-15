import * as allure from 'allure-js-commons';
import { test, expect } from '../../../fixtures/monsters';
import type { Section } from '../../../pages/monsters/MonstersPage';

const SECTIONS: Section[] = ['services', 'gallery', 'how', 'about', 'contact'];

test.describe('Home page', () => {
  test.beforeEach(async ({ site }) => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Home page');
    await site.goto();
  });

  test('loads with title, hero and every section', { tag: ['@smoke'] }, async ({ page, site }) => {
    await allure.severity(allure.Severity.BLOCKER);

    await expect(page).toHaveTitle(site.labels.title);
    await expect(site.heading).toHaveText(site.labels.heading);
    await expect(page.locator('img.hero-logo')).toBeVisible();
    for (const id of SECTIONS) {
      await expect.soft(site.section(id), `section #${id}`).toBeAttached();
      await expect.soft(site.section(id).getByRole('heading', { level: 2 }).first()).not.toBeEmpty();
    }
    await expect.soft(site.serviceCards).toHaveCount(4);
    await expect.soft(page.locator('ol.steps > li')).toHaveCount(4);
  });

  for (const id of SECTIONS) {
    test(`nav link scrolls to #${id}`, async ({ page, site }) => {
      await site.navLink(id).click();

      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(site.section(id)).toBeInViewport();
    });
  }

  test('footer shows the current year and Facebook links open safely', async ({ site }) => {
    await expect(site.footerYear).toHaveText(String(new Date().getFullYear()));

    const count = await site.facebookLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i++) {
      const link = site.facebookLinks.nth(i);
      await expect.soft(link).toHaveAttribute('href', 'https://www.facebook.com/SubstandardMiniatures');
      await expect.soft(link).toHaveAttribute('target', '_blank');
      await expect.soft(link).toHaveAttribute('rel', /noopener/);
    }
  });

  test('every image on the page loads', async ({ page, request }) => {
    await allure.severity(allure.Severity.CRITICAL);

    // Includes hidden galleries and lazy-loaded photos, so check each file directly.
    const sources = await page.locator('img[src]').evaluateAll((imgs) =>
      [...new Set(imgs.map((img) => (img as HTMLImageElement).src))],
    );
    expect(sources.length).toBeGreaterThan(10);
    for (const src of sources) {
      const res = await request.get(src);
      expect.soft(res.status(), src).toBe(200);
    }
  });

  test('page has no JavaScript errors', async ({ page, site }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await site.goto();
    await site.tab('painting').click();
    await site.gallery('miniatures').locator('.gallery-item').first().click();
    await page.keyboard.press('Escape');

    expect(errors).toEqual([]);
  });
});
