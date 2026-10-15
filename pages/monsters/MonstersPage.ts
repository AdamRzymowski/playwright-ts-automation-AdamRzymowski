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
    tabs: { resin: 'Resin printing', fdm: 'FDM printing', design: 'Design examples', painting: 'Painting' },
    menuButton: 'Open menu',
    submit: 'Send request',
    sending: 'Sending…',
    ok: "Thanks! Your request has been sent. I'll be in touch soon.",
    err: 'Sorry, something went wrong. Please try again or message me on Facebook.',
    languageField: 'English',
  },
  pl: {
    path: '/pl.html',
    title: /Usługi druku 3D/,
    heading: /Potwornie dobre wydruki/,
    nav: { services: 'Usługi', gallery: 'Galeria', how: 'Jak to działa', about: 'O nas', contact: 'Zamów wydruk' },
    tabs: { resin: 'Druk żywiczny', fdm: 'Druk FDM', design: 'Przykładowe projekty', painting: 'Malowanie' },
    menuButton: 'Otwórz menu',
    submit: 'Wyślij zapytanie',
    sending: 'Wysyłanie…',
    ok: 'Dziękuję! Zapytanie zostało wysłane. Wkrótce się odezwę.',
    err: 'Przepraszam, coś poszło nie tak. Spróbuj ponownie lub napisz do mnie na Facebooku.',
    languageField: 'Polski',
  },
} as const;

export type RequestDetails = {
  name: string;
  email: string;
  phone?: string;
  service: string;
  material?: string;
  quantity?: number;
  neededBy?: string;
  delivery?: string;
  fileLink?: string;
  message: string;
};

export class MonstersPage {
  readonly labels: (typeof LABELS)[Lang];
  readonly header: Locator;
  readonly nav: Locator;
  readonly menuButton: Locator;
  readonly heading: Locator;
  readonly serviceCards: Locator;
  readonly tabs: Locator;
  readonly subtabRow: Locator;
  readonly subtabs: Locator;
  readonly galleries: Locator;
  readonly lightbox: Locator;
  readonly lightboxImage: Locator;
  readonly lightboxCaption: Locator;
  readonly lightboxClose: Locator;
  readonly form: Locator;
  readonly submitButton: Locator;
  readonly formStatus: Locator;
  readonly footerYear: Locator;
  readonly facebookLinks: Locator;

  constructor(readonly page: Page, readonly lang: Lang = 'en') {
    this.labels = LABELS[lang];
    this.header = page.locator('header.site-header');
    this.nav = page.locator('nav.nav');
    this.menuButton = page.getByRole('button', { name: this.labels.menuButton });
    this.heading = page.getByRole('heading', { level: 1 });
    this.serviceCards = page.locator('a.service');
    this.tabs = page.locator('.tab:not(.subtab)');
    this.subtabRow = page.locator('.subtabs');
    this.subtabs = page.locator('.subtab');
    this.galleries = page.locator('.gallery');
    this.lightbox = page.locator('.lightbox');
    this.lightboxImage = this.lightbox.locator('img');
    this.lightboxCaption = this.lightbox.locator('.lightbox-caption');
    this.lightboxClose = this.lightbox.locator('.lightbox-close');
    this.form = page.locator('#request-form');
    this.submitButton = this.form.getByRole('button', { name: this.labels.submit });
    this.formStatus = this.form.getByRole('status');
    this.footerYear = page.locator('#year');
    this.facebookLinks = page.locator('a[href*="facebook.com"]');
  }

  async goto(hash = '') {
    await this.page.goto(this.labels.path + hash);
  }

  navLink(section: Section): Locator {
    return this.nav.getByRole('link', { name: this.labels.nav[section], exact: true });
  }

  section(section: Section): Locator {
    return this.page.locator(`section#${section}`);
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
    return this.page.locator(`.lang a[hreflang="${lang}"]`);
  }

  /** The one gallery that is currently shown. */
  visibleGallery(): Locator {
    return this.page.locator('.gallery:not([hidden])');
  }

  field(name: string): Locator {
    return this.form.locator(`[name="${name}"]`);
  }

  async fillRequest(details: RequestDetails) {
    await this.field('name').fill(details.name);
    await this.field('email').fill(details.email);
    if (details.phone) await this.field('phone').fill(details.phone);
    await this.field('print_type').selectOption(details.service);
    if (details.material) await this.field('colour_material').fill(details.material);
    if (details.quantity) await this.field('quantity').fill(String(details.quantity));
    if (details.neededBy) await this.field('needed_by').fill(details.neededBy);
    if (details.delivery) await this.field('delivery').selectOption(details.delivery);
    if (details.fileLink) await this.field('file_link').fill(details.fileLink);
    await this.field('message').fill(details.message);
  }
}
