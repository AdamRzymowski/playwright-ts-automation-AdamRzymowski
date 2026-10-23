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

  test('Home page loads with title, hero and all sections', { tag: ['@smoke'] }, async ({ page, site }) => {
    await allure.severity(allure.Severity.BLOCKER);

    await expect(page).toHaveTitle(site.labels.title);
    await expect(site.heading).toHaveText(site.labels.heading);
    await expect(site.heroLogo).toBeVisible();
    for (const id of SECTIONS) {
      await expect.soft(site.section(id), `section #${id}`).toBeAttached();
      await expect.soft(site.section(id).getByRole('heading', { level: 2 }).first()).not.toBeEmpty();
    }
    await expect.soft(site.serviceCards).toHaveCount(4);
    await expect.soft(site.howSteps).toHaveCount(4);
  });

  for (const id of SECTIONS) {
    test(`Menu link scrolls to the #${id} section`, async ({ page, site }) => {
      await site.header.clickNav(id);

      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(site.section(id)).toBeInViewport();
    });
  }

  test('Footer shows the current year and safe Facebook links', async ({ site }) => {
    await expect(site.footer.year).toHaveText(String(new Date().getFullYear()));

    const count = await site.facebookLinks.count();
    expect(count).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < count; i++) {
      const link = site.facebookLinks.nth(i);
      await expect.soft(link).toHaveAttribute('href', 'https://www.facebook.com/SubstandardMiniatures');
      await expect.soft(link).toHaveAttribute('target', '_blank');
      await expect.soft(link).toHaveAttribute('rel', /noopener/);
    }
  });

  test('Footer shows the site version', async ({ site }) => {
    await expect(site.footer.version).toHaveText(/^\d+\.\d+\.\d+$/);
    await allure.parameter('Site version', (await site.footer.version.textContent()) ?? '');
  });

  test('Every image on the page loads', async ({ request, site }) => {
    await allure.severity(allure.Severity.CRITICAL);
    // Downloads every photo; allow for a slow connection to the live site.
    test.slow();

    // Includes hidden galleries and lazy-loaded photos, so check each file directly (HEAD: no download).
    const sources = await site.images.evaluateAll((imgs) =>
      [...new Set(imgs.map((img) => (img as HTMLImageElement).src))],
    );
    expect(sources.length).toBeGreaterThan(10);
    const statuses = await Promise.all(sources.map(async (src) => [src, (await request.head(src)).status()] as const));
    for (const [src, status] of statuses) {
      expect.soft(status, src).toBe(200);
    }
  });

  test('Page runs without JavaScript errors', async ({ page, site }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await site.goto();
    await site.gallery.tab('painting').click();
    await site.gallery.items('miniatures').first().click();
    await page.keyboard.press('Escape');

    expect(errors).toEqual([]);
  });
});
