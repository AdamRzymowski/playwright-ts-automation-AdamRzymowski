import type { Locator, Page } from '@playwright/test';
import { FORM_FIELDS, type FormField, type LABELS, type Lang, type RequestDetails } from '../labels';

/** The "Request a print" form, its messages and the checks the page runs on it. */
export class RequestForm {
  readonly root: Locator;
  /** Heading above the form. */
  readonly intro: Locator;
  readonly submitButton: Locator;
  readonly requiredNote: Locator;
  /** Status line under the form: sending, sent, errors. */
  readonly status: Locator;
  /** Warning block above the Send button when a field looks like database code (SQL) (v1.8.0+). */
  readonly sqlWarning: Locator;
  /** The live "123 / 1000" counter under the description. */
  readonly descriptionCounter: Locator;
  /** Hidden anti-spam field that people never fill in. */
  readonly honeypot: Locator;
  /** The real choices in the Service dropdown (without the "choose" placeholder). */
  readonly serviceOptions: Locator;

  constructor(
    private readonly page: Page,
    private readonly labels: (typeof LABELS)[Lang],
  ) {
    this.root = page.getByTestId('request-form');
    this.intro = page.getByTestId('contact-title');
    this.submitButton = page.getByTestId('form-submit');
    this.requiredNote = page.getByTestId('form-required-note');
    this.status = page.getByTestId('form-status');
    this.sqlWarning = page.getByTestId('form-sql-warning');
    this.descriptionCounter = page.getByTestId('form-description-count');
    this.honeypot = this.root.locator('input[name="_honey"]');
    this.serviceOptions = this.field('Service').locator('option:not([value=""])');
  }

  field(name: FormField): Locator {
    return this.page.getByTestId(FORM_FIELDS[name]);
  }

  /** The red badge the site shows inside a field when it has a problem (v1.6.0+). */
  fieldError(name: FormField): Locator {
    return this.page.getByTestId(`${FORM_FIELDS[name]}-error`);
  }

  async fill(details: RequestDetails) {
    await this.field('Name').fill(details.name);
    await this.field('email').fill(details.email);
    await this.field('Service').selectOption(details.service);
    if (details.quantity !== undefined) await this.field('Quantity').fill(String(details.quantity));
    if (details.fileLink) await this.field('File link').fill(details.fileLink);
    await this.field('Description').fill(details.description);
  }

  /** Puts text in a field without typing, the way autofill or a script would (bypasses maxlength). */
  async setValueDirectly(name: FormField, value: string) {
    await this.field(name).evaluate((el, v) => {
      (el as HTMLInputElement).value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }

  /** Browser validation message of a field ('' when valid). */
  async validationMessage(name: FormField): Promise<string> {
    return this.field(name).evaluate((el) => (el as HTMLInputElement).validationMessage);
  }

  async isValid(name: FormField): Promise<boolean> {
    return this.field(name).evaluate((el) => (el as HTMLInputElement).validity.valid);
  }

  /** Subject line the page builds for FormSubmit, e.g. "FDM print request from Anna - Substandard Monsters". */
  expectedSubject(details: RequestDetails): string {
    return `${details.service} request from ${details.name} - Substandard Monsters${this.labels.subjectSuffix}`;
  }
}
