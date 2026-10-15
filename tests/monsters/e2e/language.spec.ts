import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { createPrintRequest, MONSTER_SERVICES } from '../../utils/testData';

test.describe('Languages (EN / PL)', () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Languages');
  });

  test('switches from English to Polish and back', { tag: ['@smoke'] }, async ({ page, site, sitePl }) => {
    await allure.severity(allure.Severity.CRITICAL);
    await site.goto();

    await test.step('EN page is marked as current', async () => {
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(site.languageLink('en')).toHaveAttribute('aria-current', 'true');
    });

    await test.step('switch to PL', async () => {
      await site.languageLink('pl').click();
      await expect(page).toHaveURL(/pl\.html$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
      await expect(page).toHaveTitle(sitePl.labels.title);
      await expect(sitePl.heading).toHaveText(sitePl.labels.heading);
      await expect(sitePl.navLink('gallery')).toBeVisible();
    });

    await test.step('switch back to EN', async () => {
      await sitePl.languageLink('en').click();
      await expect(page).toHaveURL(/index\.html$/);
      await expect(site.heading).toHaveText(site.labels.heading);
    });
  });

  test('Polish nav, tabs and form are translated', async ({ sitePl }) => {
    await sitePl.goto();
    const { nav, tabs } = sitePl.labels;

    for (const [section, label] of Object.entries(nav)) {
      await expect.soft(sitePl.navLink(section as keyof typeof nav)).toHaveText(label);
    }
    for (const [name, label] of Object.entries(tabs)) {
      await expect.soft(sitePl.tab(name as keyof typeof tabs)).toHaveText(label);
    }
    await expect.soft(sitePl.submitButton).toBeVisible();
    const options = await sitePl.field('print_type').locator('option:not([value=""])').allTextContents();
    expect.soft(options).toEqual([...MONSTER_SERVICES.pl]);
  });

  test('Polish form sends in Polish and confirms in Polish', async ({ page, sitePl }) => {
    let body = '';
    await page.route(FORMSUBMIT, async (route) => {
      body = route.request().postDataBuffer()?.toString('utf8') ?? '';
      await route.fulfill({ json: { success: 'true' } });
    });
    await sitePl.goto('#contact');

    await sitePl.fillRequest(createPrintRequest({ service: MONSTER_SERVICES.pl[1], delivery: 'Wysyłka' }));
    await sitePl.submitButton.click();

    await expect(sitePl.formStatus).toHaveText(sitePl.labels.ok);
    expect.soft(body).toContain('Polski');
    expect.soft(body).toContain('Nowe zamówienie wydruku');
  });

  test('EN and PL pages have the same photos and services', async ({ page, site, sitePl }) => {
    await allure.description(
      'The setup guide says every change must be made in both index.html and pl.html. ' +
        'This test catches a photo or service added to only one of them.',
    );

    const snapshot = async () => ({
      services: await page.locator('a.service').evaluateAll((els) => els.map((e) => e.getAttribute('data-gallery'))),
      galleries: await page.locator('.gallery').evaluateAll((els) =>
        Object.fromEntries(
          els.map((g) => [
            g.getAttribute('data-gallery'),
            [...g.querySelectorAll('img')].map((img) => img.getAttribute('src')),
          ]),
        ),
      ),
    });

    await site.goto();
    const en = await snapshot();
    await sitePl.goto();
    const pl = await snapshot();

    expect.soft(pl.services, 'service cards').toEqual(en.services);
    for (const name of Object.keys(en.galleries)) {
      expect.soft(pl.galleries[name], `photos in ${name} gallery`).toEqual(en.galleries[name]);
    }
  });
});
