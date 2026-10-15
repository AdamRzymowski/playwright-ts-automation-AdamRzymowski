import { faker } from '@faker-js/faker';

export type User = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

/** Builds a random user; pass overrides to pin specific fields. */
export function createUser(overrides: Partial<User> = {}): User {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    firstName,
    lastName,
    email: faker.internet.email({ firstName, lastName }).toLowerCase(),
    password: faker.internet.password({ length: 12 }),
    ...overrides,
  };
}

/** Builds a list of short random task titles. */
export function createTodos(count = 3): string[] {
  return Array.from({ length: count }, () => faker.lorem.sentence({ min: 2, max: 5 }));
}
