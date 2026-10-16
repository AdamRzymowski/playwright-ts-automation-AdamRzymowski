import * as allure from 'allure-js-commons';
import { test, expect } from '../../../fixtures/monsters';
import type { Lang } from '../../../pages/monsters/MonstersPage';

const FACEBOOK_PAGE = 'SubstandardMiniatures';

test.describe('Facebook links', () => {
  test.beforeEach(async () => {
    await allure.epic('Substandard Monsters');
    await allure.feature('Facebook');
  });

  for (const lang of ['en', 'pl'] as Lang[]) {
    test(`each Facebook link opens the Facebook page in a new tab (${lang})`, { tag: ['@smoke'] }, async ({ page, site, sitePl }) => {
      await allure.severity(allure.Severity.CRITICAL);
      const s = lang === 'en' ? site : sitePl;
      await s.goto();
      const pageUrl = page.url();

      const count = await s.facebookLinks.count();
      expect(count, 'contact button + footer link').toBe(2);

      for (let i = 0; i < count; i++) {
        await test.step(`link ${i + 1}: "${(await s.facebookLinks.nth(i).innerText()).trim()}"`, async () => {
          const link = s.facebookLinks.nth(i);
          const href = (await link.getAttribute('href'))!;
          // Read the status from the new tab's own page load: Facebook rejects bare API requests with 400.
          const responsePromise = page
            .context()
            .waitForEvent('response', (r) => r.url() === href && r.request().isNavigationRequest());
          const popupPromise = page.waitForEvent('popup');
          await link.click();
          const [popup, response] = await Promise.all([popupPromise, responsePromise]);

          // Facebook may land on the page itself or on a login/consent wall that keeps the page in the URL.
          await popup.waitForURL(/facebook\.com/);
          expect.soft(response.status(), `${href} responds`).toBeLessThan(400);
          expect.soft(decodeURIComponent(popup.url())).toContain(FACEBOOK_PAGE);
          await allure.attachment(`facebook-${lang}-${i + 1}.png`, await popup.screenshot(), 'image/png');

          // The shop stays open in the original tab.
          expect.soft(page.url()).toBe(pageUrl);
          await popup.close();
        });
      }
    });
  }
});
