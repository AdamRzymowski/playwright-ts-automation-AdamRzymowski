import { faker } from '@faker-js/faker';
import type { ShippingInfo } from '../../pages/saucedemo/CheckoutPage';
import type { RequestDetails } from '../../pages/monsters/MonstersPage';

/** Public demo accounts listed on the saucedemo.com login page (not real credentials). */
export const USERS = {
  standard: 'standard_user',
  lockedOut: 'locked_out_user',
} as const;
export const PASSWORD = 'secret_sauce';

export const PRODUCTS = {
  backpack: 'Sauce Labs Backpack',
  bikeLight: 'Sauce Labs Bike Light',
  boltTShirt: 'Sauce Labs Bolt T-Shirt',
} as const;

/** Builds random checkout details; pass overrides to pin specific fields. */
export function createShippingInfo(overrides: Partial<ShippingInfo> = {}): ShippingInfo {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    postalCode: faker.location.zipCode(),
    ...overrides,
  };
}

/** Email address entered into forms as test data (the project owner's own inbox). */
export const TEST_EMAIL = 'adamrzymowski@gmail.com';
/** Email entered in REAL (opt-in) submissions; SUBMIT_EMAIL overrides it for a run. */
export const REAL_SUBMIT_EMAIL = process.env.SUBMIT_EMAIL ?? TEST_EMAIL;

/** Service dropdown options on the Substandard Monsters request form, per language. */
export const MONSTER_SERVICES = {
  en: ['Resin print', 'FDM print', 'Project design (no file yet)', 'Miniature painting', 'Not sure'],
  pl: ['Druk żywiczny', 'Druk FDM', 'Projekt (nie mam pliku)', 'Malowanie figurek', 'Nie wiem'],
} as const;

/** Builds a random, fully filled print request; pass overrides to pin specific fields. */
export function createPrintRequest(overrides: Partial<RequestDetails> = {}): RequestDetails {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    name: `${firstName} ${lastName}`,
    email: TEST_EMAIL,
    service: faker.helpers.arrayElement(MONSTER_SERVICES.en),
    quantity: faker.number.int({ min: 1, max: 20 }),
    fileLink: faker.internet.url(),
    // Comfortably above the form's 5-word minimum.
    description: faker.lorem.sentences(2),
    ...overrides,
  };
}

/** A description with exactly n words. */
export function words(n: number): string {
  return faker.lorem.words(n);
}
