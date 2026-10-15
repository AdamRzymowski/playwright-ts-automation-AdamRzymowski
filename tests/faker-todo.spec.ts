import { test, expect } from '@playwright/test';
import { createTodos } from './utils/testData';

test('adds Faker-generated todos', async ({ page }) => {
  const todos = createTodos(3);

  await page.goto('https://demo.playwright.dev/todomvc/');
  const newTodo = page.getByPlaceholder('What needs to be done?');

  for (const todo of todos) {
    await newTodo.fill(todo);
    await newTodo.press('Enter');
  }

  await expect(page.getByTestId('todo-title')).toHaveText(todos);
});
