import { test, expect } from '@playwright/test';
import { loginAsTestUser } from './helpers/auth';

test.describe('Articles page (authenticated)', () => {
  test.beforeEach(async ({ context }) => {
    await loginAsTestUser(context);
  });

  test('authenticated user can access article list at / without redirect', async ({ page }) => {
    await page.goto('/');
    // Authenticated + onboarded users should stay on / (the article list page)
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);
  });

  test('articles page renders article list or empty state', async ({ page }) => {
    await page.goto('/');
    // Should stay on the article list page
    await expect(page).toHaveURL(/^http:\/\/localhost:\d+\/$/);


    // Page should render either article cards or an empty-state message
    const hasArticles = await page
      .locator('[data-testid="article-card"], article, .article-item')
      .count()
      .then((c) => c > 0);
    const hasEmptyState = await page
      .getByText(/no articles|get started|create your first|process a video|paste a video/i)
      .isVisible()
      .catch(() => false);
    expect(hasArticles || hasEmptyState).toBe(true);
  });
});
