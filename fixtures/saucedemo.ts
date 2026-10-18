import { test as base, setActivePage, withStepScreenshots } from './base';
import { LoginPage } from '../pages/saucedemo/LoginPage';
import { InventoryPage } from '../pages/saucedemo/InventoryPage';
import { CartPage } from '../pages/saucedemo/CartPage';
import { CheckoutPage } from '../pages/saucedemo/CheckoutPage';
import { PASSWORD, USERS } from '../tests/utils/testData';

type Pages = {
  /** Always on: tells step screenshots which page to capture. */
  trackPage: void;
  loginPage: LoginPage;
  inventoryPage: InventoryPage;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  /** Inventory page after logging in as the standard user. */
  loggedIn: InventoryPage;
};

/** Use this `test` in specs instead of the one from @playwright/test to get page objects injected. */
export const test = withStepScreenshots(
  base.extend<Pages>({
    trackPage: [
      async ({ page }, use) => {
        setActivePage(page);
        await use();
        setActivePage(undefined);
      },
      { auto: true },
    ],
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
  }),
);

export { expect } from '@playwright/test';
