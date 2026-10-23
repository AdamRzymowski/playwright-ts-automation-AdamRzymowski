import type { Locator, Page } from '@playwright/test';
import type { Lang, Section } from '../labels';
import { waitForSiteScript } from './siteScript';

const NAV_TESTID: Record<Section, string> = {
  services: 'nav-services',
  gallery: 'nav-gallery',
  how: 'nav-how',
  about: 'nav-about',
  contact: 'nav-request',
};

/** Header: logo, menu links, language switch and the ☰ menu button on phones. */
export class Header {
  readonly root: Locator;
  readonly logo: Locator;
  readonly logoImage: Locator;
  readonly nav: Locator;
  readonly menuButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.getByTestId('header');
    this.logo = page.getByTestId('header-logo');
    this.logoImage = this.logo.locator('img');
    this.nav = page.getByTestId('nav');
    this.menuButton = page.getByTestId('nav-toggle');
  }

  navLink(section: Section): Locator {
    return this.page.getByTestId(NAV_TESTID[section]);
  }

  languageLink(lang: Lang): Locator {
    return this.page.getByTestId(`lang-${lang}`);
  }

  /** At phone width the menu is behind the ☰ button; open it if so (no-op on desktop). */
  async openMenuIfCollapsed() {
    await waitForSiteScript(this.page);
    if ((await this.menuButton.isVisible()) && (await this.menuButton.getAttribute('aria-expanded')) !== 'true') {
      await this.menuButton.click();
      await this.page.waitForFunction(() => document.querySelector('[data-testid="nav-toggle"]')?.getAttribute('aria-expanded') === 'true');
    }
  }

  /** Clicks a header link the way a user would on any screen size. */
  async clickNav(section: Section) {
    await this.openMenuIfCollapsed();
    await this.navLink(section).click();
  }
}
