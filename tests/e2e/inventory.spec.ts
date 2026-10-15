import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures/test';
import { PRODUCTS } from '../utils/testData';

test.describe('Inventory', () => {
  test.beforeEach(async () => {
    await allure.epic('Web shop');
    await allure.feature('Product catalogue');
  });

  test('every product card is complete', async ({ loggedIn }) => {
    await allure.severity(allure.Severity.NORMAL);

    const count = await loggedIn.items.count();
    expect(count).toBeGreaterThan(0);

    // Soft assertions: check every card and report all problems at once, instead of stopping at the first.
    for (let i = 0; i < count; i++) {
      const card = loggedIn.items.nth(i);
      await expect.soft(card.getByTestId('inventory-item-name')).not.toBeEmpty();
      await expect.soft(card.getByTestId('inventory-item-desc')).not.toBeEmpty();
      await expect.soft(card.getByTestId('inventory-item-price')).toHaveText(/^\$\d+\.\d{2}$/);
      await expect.soft(card.getByRole('img')).toBeVisible();
      await expect.soft(card.getByRole('button', { name: 'Add to cart' })).toBeEnabled();
    }
  });

  test('sort by price, low to high', async ({ loggedIn }) => {
    await loggedIn.sortBy('lohi');

    const prices = await loggedIn.prices();
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  test('sort by name, Z to A', async ({ loggedIn }) => {
    await loggedIn.sortBy('za');

    const names = await loggedIn.itemNames.allTextContents();
    expect(names).toEqual([...names].sort().reverse());
    await expect(loggedIn.sortSelect).toHaveValue('za');
  });

  test('add and remove products updates the cart badge', { tag: ['@smoke'] }, async ({ loggedIn }) => {
    await allure.severity(allure.Severity.CRITICAL);

    await test.step('add two products', async () => {
      await loggedIn.addToCart(PRODUCTS.backpack);
      await loggedIn.addToCart(PRODUCTS.bikeLight);
      await expect(loggedIn.cartBadge).toHaveText('2');
    });

    await test.step('remove one product', async () => {
      await loggedIn.removeFromCart(PRODUCTS.backpack);
      await expect(loggedIn.cartBadge).toHaveText('1');
    });

    await test.step('remove the last product', async () => {
      await loggedIn.removeFromCart(PRODUCTS.bikeLight);
      await expect(loggedIn.cartBadge).toBeHidden();
    });
  });
});
