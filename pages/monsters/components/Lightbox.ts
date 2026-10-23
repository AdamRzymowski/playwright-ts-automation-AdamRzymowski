import type { Locator, Page } from '@playwright/test';

/** Enlarged photo view opened from the gallery. */
export class Lightbox {
  readonly root: Locator;
  readonly image: Locator;
  readonly caption: Locator;
  /** The × button. */
  readonly closeButton: Locator;

  constructor(page: Page) {
    this.root = page.getByTestId('lightbox');
    this.image = page.getByTestId('lightbox-image');
    this.caption = page.getByTestId('lightbox-caption');
    this.closeButton = page.getByTestId('lightbox-close');
  }
}
