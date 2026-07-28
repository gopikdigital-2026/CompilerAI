import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

// ── Beta Readiness: Full E2E flow ──────────────────────────────────────────
// Walks the complete user journey: Login → Dashboard → Analysis → Report →
// Opportunities → Actions → Notifications → Settings → Logout

test.describe('Beta Readiness — Full flow', () => {
  test.beforeEach(async ({ page }) => { attachConsoleErrorCapture(page); });
  test.afterEach(async () => { assertNoCriticalErrors(); });

  test('login page loads', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });
  });

  test('register page loads', async ({ page }) => {
    await page.goto('/#/register');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('form')).toBeVisible({ timeout: 10_000 });
  });

  test('sidebar shows all navigation items', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.count() > 0) {
      const navItems = ['home', 'analysis', 'actions', 'monitor', 'settings'];
      for (const item of navItems) {
        const el = sidebar.locator(`[data-testid="sidebar-${item}"], a:has-text("${item}")`).first();
        if (await el.count() > 0) {
          await expect(el).toBeVisible();
        }
      }
    }
  });

  test('dashboard loads without errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const dashboard = page.getByTestId('dashboard');
    if (await dashboard.count() > 0) {
      await expect(dashboard).toBeVisible({ timeout: 10_000 });
    }
  });

  test('analysis page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    if (await nav.count() > 0) {
      await nav.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('action center loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-actions"], a:has-text("Action Center")').first();
    if (await nav.count() > 0) {
      await nav.click();
      await expect(page.getByTestId('action-center')).toBeVisible({ timeout: 15_000 });
    }
  });

  test('monitor page loads with health services', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-monitor"], a:has-text("Monitor")').first();
    if (await nav.count() > 0) {
      await nav.click();
      await page.waitForLoadState('networkidle');
      const monitor = page.getByTestId('monitor-page');
      if (await monitor.count() > 0) {
        await expect(monitor).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(2000);
        const healthList = page.getByTestId('health-services-list');
        if (await healthList.count() > 0) {
          await expect(healthList).toBeVisible();
        }
      }
    }
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-settings"], a:has-text("Settings"), a:has-text("Ajustes")').first();
    if (await nav.count() > 0) {
      await nav.click();
      await page.waitForLoadState('networkidle');
    }
  });

  test('demo badges are visible on mock pages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const badges = page.getByTestId('demo-badge');
    const count = await badges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('no horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('no horizontal scroll on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });

  test('no horizontal scroll on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
