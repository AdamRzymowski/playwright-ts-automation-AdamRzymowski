import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/saucedemo/LoginPage';
import { InventoryPage } from '../pages/saucedemo/InventoryPage';
import { CartPage } from '../pages/saucedemo/CartPage';
import { CheckoutPage } from '../pages/saucedemo/CheckoutPage';
import { PASSWORD, USERS } from '../tests/utils/testData';

type Pages = {
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  /** Inventory page after logging in as the standard user. */
  loggedIn: InventoryPage;
};

/** Use this `test` in specs instead of the one from @playwright/test to get page objects injected. */
export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  inventoryPage: async ({ page }, use) => use(new InventoryPage(page)),
  cartPage: async ({ page }, use) => use(new CartPage(page)),
  checkoutPage: async ({ page }, use) => use(new CheckoutPage(page)),
  loggedIn: async ({ loginPage, inventoryPage }, use) => {
    await loginPage.goto();
    await loginPage.login(USERS.standard, PASSWORD);
    await inventoryPage.title.waitFor();
    await use(inventoryPage);
  },
});

export { expect } from '@playwright/test';
