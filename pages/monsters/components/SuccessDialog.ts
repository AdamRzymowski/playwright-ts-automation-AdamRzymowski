import type { Locator, Page } from '@playwright/test';

/** Success pop-up shown after a request is sent (v1.7.0+). */
export class SuccessDialog {
  readonly root: Locator;
  readonly title: Locator;
  readonly text: Locator;
  /** The main "Great, thanks" button. */
  readonly closeButton: Locator;
  /** The × in the corner. */
  readonly xButton: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId('success-dialog');
    this.title = page.getByTestId('success-dialog-title');
    this.text = page.getByTestId('success-dialog-text');
    this.closeButton = page.getByTestId('success-dialog-close');
    this.xButton = page.getByTestId('success-dialog-x');
  }
}
