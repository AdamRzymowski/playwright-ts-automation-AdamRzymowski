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
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    phone: faker.phone.number({ style: 'international' }),
    service: faker.helpers.arrayElement(MONSTER_SERVICES.en),
    material: faker.helpers.arrayElement(['black PLA', 'grey resin', 'red PETG', 'not sure']),
    quantity: faker.number.int({ min: 1, max: 20 }),
    neededBy: faker.date.soon({ days: 60 }).toISOString().slice(0, 10),
    fileLink: faker.internet.url(),
    message: faker.lorem.sentences(2),
    ...overrides,
  };
}
