import type { Locator, Page } from '@playwright/test';
import type { GalleryName } from '../labels';

/** Gallery: category tabs, the Miniatures / Terrain sub-tabs and one photo panel per category. */
export class Gallery {
  readonly root: Locator;
  readonly tabs: Locator;
  /** The tab marked active (exactly one at a time). */
  readonly activeTab: Locator;
  readonly subtabRow: Locator;
  readonly subtabs: Locator;
  /** Every photo panel, shown or hidden. */
  readonly panels: Locator;
  /** Every photo in every panel. */
  readonly allItems: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('gallery');
    this.tabs = page.getByTestId('gallery-tabs').getByRole('tab');
    this.activeTab = this.tabs.and(page.locator('.active'));
    this.subtabRow = page.getByTestId('gallery-subtabs');
    this.subtabs = this.subtabRow.getByRole('tab');
    this.panels = page.locator('.gallery');
    this.allItems = page.locator('.gallery-item');
  }

  /** A tab or sub-tab by category. */
  tab(name: GalleryName): Locator {
    return this.page.locator(`[role="tab"][data-gallery="${name}"]`);
  }

  /** The photo panel of a category. */
  panel(name: GalleryName): Locator {
    return this.page.locator(`.gallery[data-gallery="${name}"]`);
  }

  /** The one panel that is currently shown. */
  visiblePanel(): Locator {
    return this.page.locator('.gallery:not([hidden])');
  }

  /** Photos of one category. */
  items(name: GalleryName): Locator {
    return this.panel(name).locator('.gallery-item');
  }

  /** The image inside one photo (an item from items(), visibleItems() or allItems). */
  imageOf(item: Locator): Locator {
    return item.locator('img');
  }

  /** The caption under one photo. */
  captionOf(item: Locator): Locator {
    return item.locator('figcaption');
  }

  /** Photos of the panel that is currently shown. */
  visibleItems(): Locator {
    return this.visiblePanel().locator('.gallery-item');
  }
}
