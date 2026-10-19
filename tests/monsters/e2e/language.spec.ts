import * as allure from 'allure-js-commons';
import { test, expect, FORMSUBMIT } from '../../../fixtures/monsters';
import { createPrintRequest, MONSTER_SERVICES, words } from '../../utils/testData';

test.describe('Languages (EN / PL)', () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Languages');
  });

  test('Language switch goes from English to Polish and back', { tag: ['@smoke'] }, async ({ page, site, sitePl }) => {
    await allure.severity(allure.Severity.CRITICAL);
    await site.goto();

    await test.step('EN page is marked as current', async () => {
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(site.languageLink('en')).toHaveAttribute('aria-current', 'true');
    });

    await test.step('switch to PL', async () => {
      await site.languageLink('pl').click();
      // Netlify serves pretty URLs (/pl, /index) as well as the file names.
      await expect(page).toHaveURL(/\/pl(\.html)?$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
      await expect(page).toHaveTitle(sitePl.labels.title);
      await expect(sitePl.heading).toHaveText(sitePl.labels.heading);
      await sitePl.openMenuIfCollapsed();
      await expect(sitePl.navLink('gallery')).toBeVisible();
    });

    await test.step('switch back to EN', async () => {
      await sitePl.languageLink('en').click();
      await expect(page).toHaveURL(/\/(index(\.html)?)?$/);
      await expect(site.heading).toHaveText(site.labels.heading);
    });
  });

  test('Polish menu, tabs and form are translated', async ({ sitePl }) => {
    await sitePl.goto();
    const { nav, tabs } = sitePl.labels;

    for (const [section, label] of Object.entries(nav)) {
      await expect.soft(sitePl.navLink(section as keyof typeof nav)).toHaveText(label);
    }
    for (const [name, label] of Object.entries(tabs)) {
      await expect.soft(sitePl.tab(name as keyof typeof tabs)).toHaveText(label);
    }
    await expect.soft(sitePl.submitButton).toHaveText(sitePl.labels.submit);
    await expect.soft(sitePl.requiredNote).toHaveText(sitePl.labels.requiredNote);
    const options = await sitePl.field('Service').locator('option:not([value=""])').allTextContents();
    expect.soft(options).toEqual([...MONSTER_SERVICES.pl]);
  });

  test('Polish form sends a Polish request and confirms in Polish', async ({ page, sitePl }) => {
    let body = '';
    await page.route(FORMSUBMIT, async (route) => {
      body = route.request().postDataBuffer()?.toString('utf8') ?? '';
      await route.fulfill({ json: { success: 'true' } });
    });
    await sitePl.goto('#contact');
    const request = createPrintRequest({ service: MONSTER_SERVICES.pl[1] });

    await sitePl.fillRequest(request);
    await sitePl.submitButton.click();

    await expect(sitePl.formStatus).toHaveText(sitePl.labels.ok);
    expect.soft(body).toContain('Polski');
    // e.g. "Druk FDM request from Anna Nowak - Substandard Monsters [PL]"
    expect.soft(body).toContain(sitePl.expectedSubject(request));
  });

  test('5-word rule message is in Polish on the Polish page', async ({ page, sitePl }) => {
    await page.route(FORMSUBMIT, (route) => route.abort());
    await sitePl.goto('#contact');

    await sitePl.fillRequest(createPrintRequest({ service: MONSTER_SERVICES.pl[0], description: words(3) }));
    await sitePl.submitButton.click();

    await expect(sitePl.fieldError('Description')).toHaveText(sitePl.labels.badges.minWords);
    await expect(sitePl.formStatus).toHaveText(sitePl.labels.fix);
  });

  test('EN and PL pages show the same photos and services', async ({ page, site, sitePl }) => {
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
