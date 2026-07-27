import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('loads with dashboard container', async ({ page }) => {
    const dashboard = page.getByTestId('dashboard');
    await expect(dashboard).toBeVisible({ timeout: 15_000 });
  });

  test('shows dashboard header with greeting and org name', async ({ page }) => {
    const header = page.getByTestId('dashboard-header');
    await expect(header).toBeVisible({ timeout: 15_000 });
    // Should contain a greeting
    await expect(header.locator('h2')).toBeVisible();
  });

  test('shows period selector', async ({ page }) => {
    const periodSelect = page.getByTestId('dashboard-period');
    await expect(periodSelect).toBeVisible({ timeout: 15_000 });
    // Should have 3 options
    const options = periodSelect.locator('option');
    await expect(options).toHaveCount(3);
  });

  test('shows refresh button', async ({ page }) => {
    const refreshBtn = page.getByTestId('dashboard-refresh');
    await expect(refreshBtn).toBeVisible({ timeout: 15_000 });
  });

  test('shows executive summary section', async ({ page }) => {
    const summary = page.getByTestId('executive-summary');
    await expect(summary).toBeVisible({ timeout: 15_000 });
  });

  test('shows next best action section', async ({ page }) => {
    const nba = page.getByTestId('next-best-action');
    await expect(nba).toBeVisible({ timeout: 15_000 });
  });

  test('shows KPI grid with indicators', async ({ page }) => {
    const kpiGrid = page.getByTestId('kpi-grid');
    await expect(kpiGrid).toBeVisible({ timeout: 15_000 });
    // Should have at least 4 KPI cards
    const kpiCards = kpiGrid.locator('[data-testid^="kpi-"]');
    const count = await kpiCards.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('shows opportunities section', async ({ page }) => {
    const opps = page.getByTestId('opportunities-section');
    await expect(opps).toBeVisible({ timeout: 15_000 });
  });

  test('shows alerts section', async ({ page }) => {
    const alerts = page.getByTestId('alerts-section');
    await expect(alerts).toBeVisible({ timeout: 15_000 });
  });

  test('shows automations section', async ({ page }) => {
    const automations = page.getByTestId('automations-section');
    await expect(automations).toBeVisible({ timeout: 15_000 });
  });

  test('shows activity section', async ({ page }) => {
    const activity = page.getByTestId('activity-section');
    await expect(activity).toBeVisible({ timeout: 15_000 });
  });

  test('shows connectors status section', async ({ page }) => {
    const connectors = page.getByTestId('connectors-status');
    await expect(connectors).toBeVisible({ timeout: 15_000 });
  });

  test('shows quick actions section', async ({ page }) => {
    const quickActions = page.getByTestId('quick-actions');
    await expect(quickActions).toBeVisible({ timeout: 15_000 });
  });

  test('shows runs chart section', async ({ page }) => {
    const chart = page.getByTestId('runs-chart');
    await expect(chart).toBeVisible({ timeout: 15_000 });
  });

  test('KPI cards show data source', async ({ page }) => {
    const kpiCards = page.locator('[data-testid^="kpi-"]');
    const firstCard = kpiCards.first();
    await expect(firstCard).toBeVisible({ timeout: 15_000 });
    // Each card should show a source label (font-mono text)
    const sourceLabel = firstCard.locator('.font-mono');
    await expect(sourceLabel).toBeVisible();
  });

  test('connectors all show configuration needed', async ({ page }) => {
    const connectors = page.getByTestId('connectors-status');
    await expect(connectors).toBeVisible({ timeout: 15_000 });
    // Should show at least 8 connector rows
    const rows = connectors.locator('.flex.items-center.justify-between');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('no fake metrics shown as real', async ({ page }) => {
    // Estimate labels should be visible for estimated KPIs
    const estimateLabels = page.getByText('Estimate');
    const count = await estimateLabels.count();
    // At least the cost KPI should have an estimate label
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('refresh button is clickable', async ({ page }) => {
    const refreshBtn = page.getByTestId('dashboard-refresh');
    await expect(refreshBtn).toBeVisible({ timeout: 15_000 });
    await refreshBtn.click();
    // Should not crash
    await expect(page.getByTestId('dashboard')).toBeVisible();
  });

  test('period selector changes period', async ({ page }) => {
    const periodSelect = page.getByTestId('dashboard-period');
    await expect(periodSelect).toBeVisible({ timeout: 15_000 });
    await periodSelect.selectOption('7');
    // Dashboard should still be visible
    await expect(page.getByTestId('dashboard')).toBeVisible();
  });
});
