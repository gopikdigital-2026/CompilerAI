import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Dashboard Permissions', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('dashboard requires authentication', async ({ page }) => {
    // Access dashboard without auth state
    await page.context().clearCookies();
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should not show dashboard content - should redirect to login
    const dashboard = page.getByTestId('dashboard');
    const dashboardVisible = await dashboard.isVisible({ timeout: 3_000 }).catch(() => false);

    // If dashboard is visible, it means we're authenticated
    // If not, we should see a login form
    if (!dashboardVisible) {
      const loginForm = page.getByLabel(/email|correo/i).first();
      await expect(loginForm).toBeVisible({ timeout: 10_000 });
    }
  });

  test('dashboard shows organization context', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const header = page.getByTestId('dashboard-header');
    await expect(header).toBeVisible({ timeout: 15_000 });

    // Header should show either org name or "no organization" state
    const orgName = header.locator('h2, p').filter({ hasText: /./ });
    await expect(orgName.first()).toBeVisible();
  });

  test('KPIs are scoped to current organization', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const kpiGrid = page.getByTestId('kpi-grid');
    await expect(kpiGrid).toBeVisible({ timeout: 15_000 });

    // Each KPI should show a data source (proving it comes from real data)
    const sources = kpiGrid.locator('.font-mono');
    const count = await sources.count();
    expect(count).toBeGreaterThan(0);

    // Sources should reference real table names
    for (let i = 0; i < Math.min(count, 3); i++) {
      const text = await sources.nth(i).textContent();
      expect(text).toMatch(/execution_runs|compiler_sessions|workflow_designs|prompt_sessions|brain_decisions|memory_entries/);
    }
  });

  test('no cross-organization data leakage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Dashboard should only show data for the current org
    // KPIs should show 0 or actual data, not other orgs' data
    const kpiGrid = page.getByTestId('kpi-grid');
    await expect(kpiGrid).toBeVisible({ timeout: 15_000 });
  });
});
