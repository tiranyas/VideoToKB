import { test, expect } from '@playwright/test';

test.describe('Login page (unauthenticated)', () => {
  test('unauthenticated user visiting / is redirected to /landing', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/landing/);
  });

  test('login page shows email input', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('login page shows submit/sign-in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});
