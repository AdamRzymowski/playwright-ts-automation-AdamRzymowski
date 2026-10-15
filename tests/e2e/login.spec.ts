import * as allure from 'allure-js-commons';
import { test, expect } from '../../fixtures/test';
import { PASSWORD, USERS } from '../utils/testData';

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await allure.epic('Web shop');
    await allure.feature('Authentication');
    await loginPage.goto();
  });

  test('standard user can log in', { tag: ['@smoke'] }, async ({ page, loginPage, inventoryPage }) => {
    await allure.severity(allure.Severity.BLOCKER);

    await loginPage.login(USERS.standard, PASSWORD);

    await expect(page).toHaveURL(/inventory\.html/);
    await expect(inventoryPage.title).toHaveText('Products');
    await expect(inventoryPage.items).toHaveCount(6);
    await expect(inventoryPage.cartBadge).toBeHidden();
  });

  test('locked out user sees an error', async ({ page, loginPage }) => {
    await allure.severity(allure.Severity.CRITICAL);

    await loginPage.login(USERS.lockedOut, PASSWORD);

    await expect(page).not.toHaveURL(/inventory\.html/);
    await expect(loginPage.error).toBeVisible();
    await expect(loginPage.error).toContainText('this user has been locked out');
  });

  test('empty form shows validation messages', async ({ loginPage }) => {
    await allure.severity(allure.Severity.NORMAL);

    await test.step('submit with no username', async () => {
      await loginPage.loginButton.click();
      await expect(loginPage.error).toContainText('Username is required');
    });

    await test.step('submit with username but no password', async () => {
      await loginPage.username.fill(USERS.standard);
      await loginPage.loginButton.click();
      await expect(loginPage.error).toContainText('Password is required');
    });
  });

  test('user can log out', { tag: ['@smoke'] }, async ({ page, loginPage, inventoryPage }) => {
    await allure.severity(allure.Severity.CRITICAL);

    await loginPage.login(USERS.standard, PASSWORD);
    await inventoryPage.logout();

    await expect(page).toHaveURL('/');
    await expect(loginPage.loginButton).toBeVisible();
  });
});
