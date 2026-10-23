/** Texts, form fields and limits of the Substandard Monsters pages, shared by the page object and its parts. */
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
    // v1.6.0+: the site shows its own red badge in each field instead of browser pop-ups.
    fix: 'Please check the fields marked in red.',
    badges: {
      name: 'Enter your name',
      emailMissing: 'Enter your email',
      emailInvalid: 'Check the email',
      service: 'Choose a service',
      quantity: 'Enter 1 to 10,000',
      descriptionMissing: 'Describe what you need',
      minWords: 'At least 5 words',
      tooLong: (n: number) => `Max. ${n} characters`,
      link: 'Enter a valid link',
      sql: 'Looks like database code',
    },
    sqlWarning:
      'Part of your request looks like database code (SQL), so it was not sent. Please describe what you need in plain words.',
    // v1.7.0+: success pop-up
    dialog: {
      title: 'Request sent!',
      text: "Thanks for your request. I'll get back to you with a quote, usually within a day or two. Keep an eye on your inbox (and spam folder).",
      close: 'Great, thanks',
      x: 'Close',
    },
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
    fix: 'Sprawdź pola zaznaczone na czerwono.',
    badges: {
      name: 'Podaj imię',
      emailMissing: 'Podaj e-mail',
      emailInvalid: 'Sprawdź e-mail',
      service: 'Wybierz usługę',
      quantity: 'Od 1 do 10 000',
      descriptionMissing: 'Opisz zamówienie',
      minWords: 'Min. 5 słów',
      tooLong: (n: number) => `Maks. ${n} znaków`,
      link: 'Podaj poprawny link',
      sql: 'Wygląda jak kod bazy danych',
    },
    sqlWarning:
      'Część zapytania wygląda jak kod bazy danych (SQL), więc nie zostało wysłane. Opisz, czego potrzebujesz, zwykłymi słowami.',
    dialog: {
      title: 'Zapytanie wysłane!',
      text: 'Dziękuję za zapytanie. Odezwę się z wyceną, zwykle w ciągu jednego lub dwóch dni. Zajrzyj do skrzynki (także do folderu spam).',
      close: 'Super, dzięki',
      x: 'Zamknij',
    },
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
  fileLink?: string;
  description: string;
};

/** Form field name (as posted to FormSubmit) -> data-testid of its input. */
export const FORM_FIELDS = {
  Name: 'form-name',
  email: 'form-email',
  Service: 'form-service',
  Quantity: 'form-quantity',
  'File link': 'form-file-link',
  Description: 'form-description',
} as const;
export type FormField = keyof typeof FORM_FIELDS;

/** Character limits (maxlength) of the request form, and the quantity range. */
export const FORM_LIMITS = {
  Name: 50,
  email: 50,
  'File link': 1000,
  Description: 1000,
} as const;
export type LimitedField = keyof typeof FORM_LIMITS;
export const QUANTITY_RANGE = { min: 1, max: 10_000 } as const;
