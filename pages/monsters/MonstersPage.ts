import { type Locator, type Page } from '@playwright/test';

export type Lang = 'en' | 'pl';
export type GalleryName = 'resin' | 'fdm' | 'design' | 'painting' | 'miniatures' | 'terrain';
export type Section = 'services' | 'gallery' | 'how' | 'about' | 'contact';

/** Visible text that differs between index.html (en) and pl.html (pl). */
export const LABELS = {
  en: {
    path: '/index.html',
    title: /3D Printing Service/,
    heading: /Monstrously good prints/,
    nav: { services: 'Services', gallery: 'Gallery', how: 'How it works', about: 'About Us', contact: 'Request a print' },
    tabs: { resin: 'Resin printing', fdm: 'FDM printing', design: 'Design examples', painting: 'Miniatures and Terrain' },
    menuButton: 'Open menu',
    submit: 'Send request',
    requiredNote: '* Required fields',
    sending: 'Sending…',
    ok: "Thanks! Your request has been sent. I'll be in touch soon.",
    err: 'Sorry, something went wrong. Please try again or message me on Facebook.',
    minWords: 'Please describe what you need in at least 5 words.',
    languageField: 'English',
    subjectSuffix: '',
  },
  pl: {
    path: '/pl.html',
    title: /Usługi druku 3D/,
    heading: /Potwornie dobre wydruki/,
    nav: { services: 'Usługi', gallery: 'Galeria', how: 'Jak to działa', about: 'O nas', contact: 'Zamów wydruk' },
    tabs: { resin: 'Druk żywiczny', fdm: 'Druk FDM', design: 'Przykładowe projekty', painting: 'Figurki i makiety' },
    menuButton: 'Otwórz menu',
    submit: 'Wyślij zapytanie',
    requiredNote: '* Pola obowiązkowe',
    sending: 'Wysyłanie…',
    ok: 'Dziękuję! Zapytanie zostało wysłane. Wkrótce się odezwę.',
    err: 'Przepraszam, coś poszło nie tak. Spróbuj ponownie lub napisz do mnie na Facebooku.',
    minWords: 'Opisz, czego potrzebujesz, używając co najmniej 5 słów.',
    languageField: 'Polski',
    subjectSuffix: ' [PL]',
  },
} as const;

/** What a visitor types into the request form. */
export type RequestDetails = {
  name: string;
  email: string;
  service: string;
  quantity?: number;
  material?: string;
  fileLink?: string;
  description: string;
};

/** Form field name (as posted to FormSubmit) -> data-testid of its input. */
export const FORM_FIELDS = {
  Name: 'form-name',
  email: 'form-email',
  Service: 'form-service',
  Quantity: 'form-quantity',
  'Colour / material': 'form-colour-material',
  'File link': 'form-file-link',
  Description: 'form-description',
} as const;
export type FormField = keyof typeof FORM_FIELDS;

const NAV_TESTID: Record<Section, string> = {
  services: 'nav-services',
  gallery: 'nav-gallery',
  how: 'nav-how',
  about: 'nav-about',
  contact: 'nav-request',
};

/** Locators use the site's data-testid attributes (see fixtures/monsters.ts). */
export class MonstersPage {
  readonly labels: (typeof LABELS)[Lang];
  readonly header: Locator;
  readonly logo: Locator;
  readonly nav: Locator;
  readonly menuButton: Locator;
  readonly heading: Locator;
  readonly heroButtons: Locator;
  readonly serviceCards: Locator;
  readonly tabs: Locator;
  readonly subtabRow: Locator;
  readonly subtabs: Locator;
  readonly galleries: Locator;
  readonly lightbox: Locator;
  readonly lightboxImage: Locator;
  readonly lightboxCaption: Locator;
  readonly lightboxClose: Locator;
  readonly contactIntro: Locator;
  readonly form: Locator;
  readonly submitButton: Locator;
  readonly requiredNote: Locator;
  readonly formStatus: Locator;
  readonly footer: Locator;
  readonly footerYear: Locator;
  readonly footerVersion: Locator;
  readonly contactFacebook: Locator;
  readonly footerFacebook: Locator;
  readonly facebookLinks: Locator;

  constructor(readonly page: Page, readonly lang: Lang = 'en') {
    this.labels = LABELS[lang];
    this.header = page.getByTestId('header');
    this.logo = page.getByTestId('header-logo');
    this.nav = page.getByTestId('nav');
    this.menuButton = page.getByTestId('nav-toggle');
    this.heading = page.getByTestId('hero-title');
    this.heroButtons = page.locator('[data-testid^="hero-"].btn');
    this.serviceCards = page.locator('a.service');
    this.tabs = page.getByTestId('gallery-tabs').getByRole('tab');
    this.subtabRow = page.getByTestId('gallery-subtabs');
    this.subtabs = this.subtabRow.getByRole('tab');
    this.galleries = page.locator('.gallery');
    this.lightbox = page.getByTestId('lightbox');
    this.lightboxImage = page.getByTestId('lightbox-image');
    this.lightboxCaption = page.getByTestId('lightbox-caption');
    this.lightboxClose = page.getByTestId('lightbox-close');
    this.contactIntro = page.getByTestId('contact-title');
    this.form = page.getByTestId('request-form');
    this.submitButton = page.getByTestId('form-submit');
    this.requiredNote = page.getByTestId('form-required-note');
    this.formStatus = page.getByTestId('form-status');
    this.footer = page.getByTestId('footer');
    this.footerYear = page.getByTestId('footer-year');
    this.footerVersion = page.getByTestId('footer-version');
    this.contactFacebook = page.getByTestId('contact-facebook');
    this.footerFacebook = page.getByTestId('footer-facebook');
    this.facebookLinks = page.locator('[data-testid="contact-facebook"], [data-testid="footer-facebook"]');
  }

  async goto(hash = '') {
    await this.page.goto(this.labels.path + hash);
    // script.js fills in the footer version first; once it's there, the click handlers are attached too.
    await this.page.waitForFunction(() => !!document.getElementById('site-version')?.textContent);
  }

  navLink(section: Section): Locator {
    return this.page.getByTestId(NAV_TESTID[section]);
  }

  section(section: Section): Locator {
    return this.page.getByTestId(section);
  }

  tab(name: GalleryName): Locator {
    return this.page.locator(`[role="tab"][data-gallery="${name}"]`);
  }

  gallery(name: GalleryName): Locator {
    return this.page.locator(`.gallery[data-gallery="${name}"]`);
  }

  serviceCard(name: GalleryName): Locator {
    return this.page.locator(`a.service[data-gallery="${name}"]`);
  }

  languageLink(lang: Lang): Locator {
    return this.page.getByTestId(`lang-${lang}`);
  }

  /** The one gallery that is currently shown. */
  visibleGallery(): Locator {
    return this.page.locator('.gallery:not([hidden])');
  }

  field(name: FormField): Locator {
    return this.page.getByTestId(FORM_FIELDS[name]);
  }

  /** Browser validation message of a field ('' when valid). */
  async validationMessage(name: FormField): Promise<string> {
    return this.field(name).evaluate((el) => (el as HTMLInputElement).validationMessage);
  }

  async isValid(name: FormField): Promise<boolean> {
    return this.field(name).evaluate((el) => (el as HTMLInputElement).validity.valid);
  }

  async fillRequest(details: RequestDetails) {
    await this.field('Name').fill(details.name);
    await this.field('email').fill(details.email);
    await this.field('Service').selectOption(details.service);
    if (details.quantity !== undefined) await this.field('Quantity').fill(String(details.quantity));
    if (details.material) await this.field('Colour / material').fill(details.material);
    if (details.fileLink) await this.field('File link').fill(details.fileLink);
    await this.field('Description').fill(details.description);
  }

  /**
   * Positions of several elements measured in one go, in page coordinates (not affected by scrolling),
   * so layout checks can't be skewed by smooth scrolling or images loading between measurements.
   */
  async boxes(selectors: string[]): Promise<{ x: number; y: number; width: number; height: number }[]> {
    return this.page.evaluate((sels) => {
      return sels.map((sel) => {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`No element for ${sel}`);
        const r = el.getBoundingClientRect();
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
      });
    }, selectors);
  }

  /** Subject line the page builds for FormSubmit, e.g. "FDM print request from Anna - Substandard Monsters". */
  expectedSubject(details: RequestDetails): string {
    return `${details.service} request from ${details.name} - Substandard Monsters${this.labels.subjectSuffix}`;
  }
}
