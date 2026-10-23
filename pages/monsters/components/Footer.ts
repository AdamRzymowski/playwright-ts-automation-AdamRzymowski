import type { Locator, Page } from '@playwright/test';

/** Footer: copyright year, site version and the Facebook link. */
export class Footer {
  readonly root: Locator;
  readonly year: Locator;
  readonly version: Locator;
  readonly facebook: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId('footer');
    this.year = page.getByTestId('footer-year');
    this.version = page.getByTestId('footer-version');
    this.facebook = page.getByTestId('footer-facebook');
  }
}
