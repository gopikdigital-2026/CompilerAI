import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Logout Flow', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('logout redirects to login', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open profile menu
    await page.getByTestId('profile-menu-trigger').click();
    await expect(page.getByTestId('profile-menu')).toBeVisible();

    // Click logout
    await page.getByTestId('logout-button').click();

    // Should be redirected to login page
    await expect(page).toHaveURL(/login|\/$/i, { timeout: 10_000 });
    // Login form should be visible
    const emailInput = page.getByLabel(/email|correo/i).first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
  });

  test('private routes are protected after logout', async ({ page }) => {
    // Logout first
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('profile-menu-trigger').click();
    await page.getByTestId('logout-button').click();
    await expect(page.getByLabel(/email|correo/i).first()).toBeVisible({ timeout: 10_000 });

    // Try to navigate directly to settings
    await page.goto('/#settings/profile');
    await page.waitForLoadState('networkidle');

    // Should NOT see settings content — should see login form
    const settingsHeading = page.locator('h2').filter({ hasText: /configuración|settings/i }).first();
    const settingsVisible = await settingsHeading.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(settingsVisible).toBeFalsy();

    // Login form should be visible
    const loginForm = page.getByLabel(/email|correo/i).first();
    await expect(loginForm).toBeVisible();
  });

  test('back button does not show private content after logout', async ({ page }) => {
    // Go to settings
    await page.goto('/#settings/profile');
    await page.waitForLoadState('networkidle');

    // Logout
    await page.getByTestId('profile-menu-trigger').click();
    await page.getByTestId('logout-button').click();
    await expect(page.getByLabel(/email|correo/i).first()).toBeVisible({ timeout: 10_000 });

    // Press back
    await page.goBack();
    await page.waitForLoadState('networkidle');

    // Should NOT see settings content
    const settingsHeading = page.locator('h2').filter({ hasText: /configuración|settings/i }).first();
    const settingsVisible = await settingsHeading.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(settingsVisible).toBeFalsy();
  });

  test('menu closes after logout click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('profile-menu-trigger').click();
    await expect(page.getByTestId('profile-menu')).toBeVisible();
    await page.getByTestId('logout-button').click();
    // Menu should no longer be visible
    await expect(page.getByTestId('profile-menu')).not.toBeVisible({ timeout: 5_000 });
  });

  test('profile menu works without profile data', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The menu trigger should be visible even if profile hasn't loaded
    const trigger = page.getByTestId('profile-menu-trigger');
    await expect(trigger).toBeVisible();

    // Opening the menu should not throw
    await trigger.click();
    await expect(page.getByTestId('profile-menu')).toBeVisible();

    // Menu should show some fallback name (not crash)
    const menuContent = page.locator('[data-testid="profile-menu"]');
    await expect(menuContent).not.toBeEmpty();
  });
});
