import type { Locator, Page } from '@playwright/test';
import { LABELS, type GalleryName, type Lang, type Section } from './labels';
import { Footer } from './components/Footer';
import { Gallery } from './components/Gallery';
import { Header } from './components/Header';
import { Lightbox } from './components/Lightbox';
import { RequestForm } from './components/RequestForm';
import { SuccessDialog } from './components/SuccessDialog';
import { waitForSiteScript } from './components/siteScript';

// Texts, field names and limits live in labels.ts; re-exported so specs keep one import.
export * from './labels';

/**
 * The Substandard Monsters page (index.html / pl.html), built from its parts:
 *   site.header   logo, menu, language switch, phone menu button
 *   site.gallery  tabs, sub-tabs, photo panels and photos
 *   site.lightbox enlarged photo
 *   site.form     request form, its fields, badges and messages
 *   site.dialog   success pop-up
 *   site.footer   year, version, Facebook
 * Locators use the site's data-testid attributes (see fixtures/monsters.ts).
 */
export class MonstersPage {
  readonly labels: (typeof LABELS)[Lang];
  readonly header: Header;
  readonly gallery: Gallery;
  readonly lightbox: Lightbox;
  readonly form: RequestForm;
  readonly dialog: SuccessDialog;
  readonly footer: Footer;

  /** The <html> element (its lang attribute). */
  readonly html: Locator;
  readonly viewportMeta: Locator;
  /** Every image with a source, anywhere on the page. */
  readonly images: Locator;
  readonly heading: Locator;
  readonly heroLogo: Locator;
  readonly heroButtons: Locator;
  /** The numbered steps in "How it works". */
  readonly howSteps: Locator;
  readonly serviceCards: Locator;
  readonly contactFacebook: Locator;
  /** Both Facebook links: under the contact text and in the footer. */
  readonly facebookLinks: Locator;

  constructor(readonly page: Page, readonly lang: Lang = 'en') {
    this.labels = LABELS[lang];
    this.header = new Header(page);
    this.gallery = new Gallery(page);
    this.lightbox = new Lightbox(page);
    this.form = new RequestForm(page, this.labels);
    this.dialog = new SuccessDialog(page);
    this.footer = new Footer(page);

    this.html = page.locator('html');
    this.viewportMeta = page.locator('meta[name="viewport"]');
    this.images = page.locator('img[src]');
    this.heading = page.getByTestId('hero-title');
    this.heroLogo = page.getByTestId('hero-logo');
    this.heroButtons = page.locator('[data-testid^="hero-"].btn');
    this.howSteps = page.getByTestId('how').locator('ol.steps > li');
    this.serviceCards = page.locator('a.service');
    this.contactFacebook = page.getByTestId('contact-facebook');
    this.facebookLinks = page.locator('[data-testid="contact-facebook"], [data-testid="footer-facebook"]');
  }

  async goto(hash = '') {
    await this.page.goto(this.labels.path + hash);
    await this.waitForScript();
  }

  /** script.js fills in the footer version first; once it's there, the click handlers are attached too. */
  async waitForScript() {
    await waitForSiteScript(this.page);
  }

  section(section: Section): Locator {
    return this.page.getByTestId(section);
  }

  serviceCard(name: GalleryName): Locator {
    return this.page.locator(`a.service[data-gallery="${name}"]`);
  }

  /**
   * Positions of several elements measured in one go, in page coordinates (not affected by scrolling),
   * so layout checks can't be skewed by smooth scrolling or images loading between measurements.
   */
  async boxes(locators: Locator[]): Promise<{ x: number; y: number; width: number; height: number }[]> {
    const handles = await Promise.all(locators.map((l) => l.elementHandle()));
    try {
      return await this.page.evaluate((els) => {
        return els.map((el, i) => {
          if (!el) throw new Error(`No element for locator ${i + 1}`);
          const r = el.getBoundingClientRect();
          return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
        });
      }, handles);
    } finally {
      await Promise.all(handles.map((h) => h?.dispose()));
    }
  }
}
