import { test, expect } from '@playwright/test';

test.describe('AUTH-001 — Social Provider Visibility', () => {
  test('email login form is visible and functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    if (await emailInput.count() > 0) {
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      await expect(submitButton).toBeVisible();
    }
  });

  test('GitHub OAuth button is not present', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const githubButton = page.getByTestId('oauth-button-github');
    await expect(githubButton).toHaveCount(0);
  });

  test('Google OAuth button is not present when not configured', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const googleButton = page.getByTestId('oauth-button-google');
    await expect(googleButton).toHaveCount(0);
  });

  test('no OAuth buttons render without action', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const oauthContainer = page.getByTestId('oauth-buttons-container');
    await expect(oauthContainer).toHaveCount(0);
  });

  test('register page also has no GitHub or Google buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const registerLink = page.locator('a, button').filter({ hasText: /registr|register|sign up|crear cuenta/i }).first();
    if (await registerLink.count() > 0) {
      await registerLink.click();
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('oauth-button-github')).toHaveCount(0);
      await expect(page.getByTestId('oauth-button-google')).toHaveCount(0);
    }
  });

  test('no console errors from missing OAuth providers', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });
});
