import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures/test';
import { PRODUCTS } from '../utils/testData';

test.describe('Mobile view', () => {
  test.beforeEach(async () => {
    await allure.epic('Web shop');
    await allure.feature('Mobile layout');
  });

  test('runs with a phone viewport and touch', async ({ page, isMobile, browserName }) => {
    test.skip(!isMobile, 'Only meaningful in a mobile project');

    const viewport = page.viewportSize();
    expect(viewport?.width).toBeLessThan(500);
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
    expect(browserName).toBe('chromium');
  });

  test('product cards stack in a single column', { tag: ['@smoke'] }, async ({ page, loggedIn }) => {
    const viewportWidth = page.viewportSize()!.width;
    const first = await loggedIn.items.nth(0).boundingBox();
    const second = await loggedIn.items.nth(1).boundingBox();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    // Same left edge and the second card below the first = one column.
    expect.soft(Math.abs(first!.x - second!.x)).toBeLessThan(2);
    expect.soft(second!.y).toBeGreaterThan(first!.y + first!.height - 1);
    // Cards fit inside the screen (no horizontal scrolling).
    expect.soft(first!.x + first!.width).toBeLessThanOrEqual(viewportWidth);

    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect.soft(pageWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test('menu and cart work with taps', async ({ page, loggedIn, cartPage }) => {
    await test.step('tap Add to cart', async () => {
      await loggedIn.items
        .filter({ hasText: PRODUCTS.backpack })
        .getByRole('button', { name: 'Add to cart' })
        .tap();
      await expect(loggedIn.cartBadge).toHaveText('1');
    });

    await test.step('tap the cart icon', async () => {
      await loggedIn.cartLink.tap();
      await expect(cartPage.itemNames).toHaveText([PRODUCTS.backpack]);
    });

    await test.step('open the menu and log out', async () => {
      await loggedIn.menuButton.tap();
      await expect(loggedIn.logoutLink).toBeVisible();
      await loggedIn.logoutLink.tap();
      await expect(page).toHaveURL('/');
    });
  });
});
