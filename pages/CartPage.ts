import { type Locator, type Page } from '@playwright/test';

export class CartPage {
  readonly title: Locator;
  readonly itemNames: Locator;
  readonly checkoutButton: Locator;
  readonly continueShoppingButton: Locator;

  constructor(readonly page: Page) {
    this.title = page.getByTestId('title');
    this.itemNames = page.getByTestId('inventory-item-name');
    this.checkoutButton = page.getByTestId('checkout');
    this.continueShoppingButton = page.getByTestId('continue-shopping');
  }

  async checkout() {
    await this.checkoutButton.click();
  }
}
