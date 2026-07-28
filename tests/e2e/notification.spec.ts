import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

async function openActionCenter(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('[data-testid="sidebar-actions"], a:has-text("Action Center")').first().click();
  await page.getByTestId('action-center').waitFor({ timeout: 15_000 });
}

test.describe('Notifications — Action Center', () => {
  test.beforeEach(async ({ page }) => { attachConsoleErrorCapture(page); });
  test.afterEach(async () => { assertNoCriticalErrors(); });

  test('notification bell is visible', async ({ page }) => {
    await openActionCenter(page);
    await expect(page.getByTestId('notifications-toggle')).toBeVisible();
  });

  test('clicking bell opens notifications panel', async ({ page }) => {
    await openActionCenter(page);
    await page.getByTestId('notifications-toggle').click();
    await expect(page.getByTestId('notifications-panel')).toBeVisible();
  });

  test('notifications panel shows header', async ({ page }) => {
    await openActionCenter(page);
    await page.getByTestId('notifications-toggle').click();
    await expect(page.getByTestId('notifications-panel').locator('text=/Notificaciones/')).toBeVisible();
  });

  test('mark all read button appears when unread', async ({ page }) => {
    await openActionCenter(page);
    await page.getByTestId('notifications-toggle').click();
    const markAll = page.getByTestId('mark-all-read');
    if (await markAll.count() > 0) {
      await markAll.click();
      await page.waitForTimeout(500);
    }
  });

  test('notification items are clickable', async ({ page }) => {
    await openActionCenter(page);
    await page.getByTestId('notifications-toggle').click();
    const items = page.getByTestId('notification-item');
    const count = await items.count();
    if (count > 0) {
      await items.first().click();
      await page.waitForTimeout(300);
    }
  });

  test('closing notifications panel', async ({ page }) => {
    await openActionCenter(page);
    await page.getByTestId('notifications-toggle').click();
    await expect(page.getByTestId('notifications-panel')).toBeVisible();
    await page.getByTestId('notifications-toggle').click();
    await expect(page.getByTestId('notifications-panel')).not.toBeVisible({ timeout: 3_000 });
  });
});
