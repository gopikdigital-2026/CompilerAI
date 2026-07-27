import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Dashboard Mobile', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('dashboard renders on mobile viewport', async ({ page, browserName }) => {
    // This project uses mobile viewport from config
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const dashboard = page.getByTestId('dashboard');
    await expect(dashboard).toBeVisible({ timeout: 15_000 });
  });

  test('header is responsive on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const header = page.getByTestId('dashboard-header');
    await expect(header).toBeVisible({ timeout: 15_000 });

    // Header should be visible and not overflow
    const boundingBox = await header.boundingBox();
    expect(boundingBox).toBeTruthy();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(390);
    }
  });

  test('KPI grid adapts to mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const kpiGrid = page.getByTestId('kpi-grid');
    await expect(kpiGrid).toBeVisible({ timeout: 15_000 });

    // On mobile, grid should be 2 columns
    const gridClass = await kpiGrid.getAttribute('class');
    expect(gridClass).toContain('grid-cols-2');
  });

  test('quick actions are tappable on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const quickActions = page.getByTestId('quick-actions');
    await expect(quickActions).toBeVisible({ timeout: 15_000 });

    // Buttons should be large enough to tap
    const firstBtn = quickActions.locator('button').first();
    const boundingBox = await firstBtn.boundingBox();
    expect(boundingBox).toBeTruthy();
    if (boundingBox) {
      expect(boundingBox.height).toBeGreaterThanOrEqual(40);
    }
  });

  test('period selector works on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const periodSelect = page.getByTestId('dashboard-period');
    await expect(periodSelect).toBeVisible({ timeout: 15_000 });
    await periodSelect.selectOption('30');
    await expect(page.getByTestId('dashboard')).toBeVisible();
  });

  test('no horizontal scroll on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that page doesn't have horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
  });

  test('sections stack vertically on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // On mobile, sections should stack (not be side by side)
    const alerts = page.getByTestId('alerts-section');
    const automations = page.getByTestId('automations-section');
    await expect(alerts).toBeVisible({ timeout: 15_000 });
    await expect(automations).toBeVisible({ timeout: 15_000 });

    // Both should be full width (not in a grid)
    const alertsBox = await alerts.boundingBox();
    const automationsBox = await automations.boundingBox();
    if (alertsBox && automationsBox) {
      // They should not be side by side (one should be below the other)
      expect(automationsBox.y).toBeGreaterThan(alertsBox.y);
    }
  });
});
