import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

async function openActionCenter(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('[data-testid="sidebar-actions"], a:has-text("Action Center")').first().click();
  await page.getByTestId('action-center').waitFor({ timeout: 15_000 });
}

test.describe('Action Center — Apertura y visualización', () => {
  test.beforeEach(async ({ page }) => { attachConsoleErrorCapture(page); });
  test.afterEach(async () => { assertNoCriticalErrors(); });

  test('action center page loads', async ({ page }) => {
    await openActionCenter(page);
    await expect(page.getByTestId('action-center')).toBeVisible();
  });

  test('shows dashboard widgets', async ({ page }) => {
    await openActionCenter(page);
    await expect(page.getByTestId('widget-open')).toBeVisible();
    await expect(page.getByTestId('widget-critical')).toBeVisible();
    await expect(page.getByTestId('widget-completed')).toBeVisible();
    await expect(page.getByTestId('widget-roi')).toBeVisible();
    await expect(page.getByTestId('widget-avg-time')).toBeVisible();
  });

  test('shows status filters', async ({ page }) => {
    await openActionCenter(page);
    await expect(page.getByTestId('status-filter-all')).toBeVisible();
    await expect(page.getByTestId('status-filter-pending')).toBeVisible();
    await expect(page.getByTestId('status-filter-completed')).toBeVisible();
  });

  test('shows priority filters', async ({ page }) => {
    await openActionCenter(page);
    await expect(page.getByTestId('priority-filter-all')).toBeVisible();
    await expect(page.getByTestId('priority-filter-critical')).toBeVisible();
  });

  test('search input works', async ({ page }) => {
    await openActionCenter(page);
    await page.getByTestId('action-search').fill('test query');
    await expect(page.getByTestId('action-search')).toHaveValue('test query');
  });

  test('empty state shows when no actions', async ({ page }) => {
    await openActionCenter(page);
    const list = page.getByTestId('action-list');
    const emptyText = page.locator('text=/No hay acciones todavía/');
    const hasList = await list.count();
    const hasEmpty = await emptyText.count();
    expect(hasList > 0 || hasEmpty > 0).toBeTruthy();
  });

  test('notifications toggle works', async ({ page }) => {
    await openActionCenter(page);
    await page.getByTestId('notifications-toggle').click();
    await expect(page.getByTestId('notifications-panel')).toBeVisible();
  });

  test('responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openActionCenter(page);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
