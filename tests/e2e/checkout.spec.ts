import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures/test';
import { CheckoutPage } from '../../pages/CheckoutPage';
import { PRODUCTS, createShippingInfo } from '../utils/testData';

test.describe('Checkout', () => {
  test.beforeEach(async () => {
    await allure.epic('Web shop');
    await allure.feature('Checkout');
  });

  test('complete purchase with Faker shipping details', { tag: ['@smoke'] }, async ({ page, loggedIn, cartPage, checkoutPage }) => {
    await allure.severity(allure.Severity.BLOCKER);
    const shipping = createShippingInfo();
    await allure.attachment('shipping-info.json', JSON.stringify(shipping, null, 2), 'application/json');

    await test.step('add products and open the cart', async () => {
      await loggedIn.addToCart(PRODUCTS.backpack);
      await loggedIn.addToCart(PRODUCTS.boltTShirt);
      await loggedIn.openCart();
      await expect(cartPage.itemNames).toHaveText([PRODUCTS.backpack, PRODUCTS.boltTShirt]);
    });

    await test.step('enter shipping details', async () => {
      await cartPage.checkout();
      await checkoutPage.fillShippingInfo(shipping);
      await expect(checkoutPage.title).toHaveText('Checkout: Overview');
    });

    await test.step('verify order totals', async () => {
      const itemSum = (await checkoutPage.itemPrices.allTextContents())
        .map((p) => CheckoutPage.amount(p))
        .reduce((a, b) => a + b, 0);
      const subtotal = CheckoutPage.amount(await checkoutPage.subtotal.textContent());
      const tax = CheckoutPage.amount(await checkoutPage.tax.textContent());
      const total = CheckoutPage.amount(await checkoutPage.total.textContent());

      expect.soft(subtotal).toBeCloseTo(itemSum, 2);
      expect.soft(tax).toBeGreaterThan(0);
      expect.soft(total).toBeCloseTo(subtotal + tax, 2);
    });

    await test.step('finish the order', async () => {
      await checkoutPage.finishButton.click();
      await expect(page).toHaveURL(/checkout-complete\.html/);
      await expect(checkoutPage.completeHeader).toHaveText('Thank you for your order!');
      await expect(loggedIn.cartBadge).toBeHidden();
    });
  });

  test('shipping form requires every field', async ({ loggedIn, cartPage, checkoutPage }) => {
    await allure.severity(allure.Severity.NORMAL);
    const shipping = createShippingInfo();

    await loggedIn.addToCart(PRODUCTS.backpack);
    await loggedIn.openCart();
    await cartPage.checkout();

    await checkoutPage.fillShippingInfo({ ...shipping, firstName: '' });
    await expect(checkoutPage.error).toContainText('First Name is required');

    await checkoutPage.fillShippingInfo({ ...shipping, lastName: '' });
    await expect(checkoutPage.error).toContainText('Last Name is required');

    await checkoutPage.fillShippingInfo({ ...shipping, postalCode: '' });
    await expect(checkoutPage.error).toContainText('Postal Code is required');
  });
});
