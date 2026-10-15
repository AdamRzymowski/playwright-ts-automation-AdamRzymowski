import { faker } from '@faker-js/faker';
import type { ShippingInfo } from '../../pages/CheckoutPage';

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
