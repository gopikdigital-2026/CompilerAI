import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Analysis Flow', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('analysis page loads with start button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to analysis page via sidebar
    const analysisNav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await analysisNav.click();
    await page.waitForLoadState('networkidle');

    const analysisPage = page.getByTestId('analysis-page');
    await expect(analysisPage).toBeVisible({ timeout: 15_000 });

    // Should have a start button
    const startBtn = page.getByTestId('analysis-start');
    await expect(startBtn).toBeVisible();
  });

  test('start button initiates analysis with progress', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const analysisNav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await analysisNav.click();
    await page.waitForLoadState('networkidle');

    const startBtn = page.getByTestId('analysis-start');
    await expect(startBtn).toBeVisible({ timeout: 15_000 });
    await startBtn.click();

    // Progress should appear
    const progress = page.getByTestId('analysis-progress');
    await expect(progress).toBeVisible({ timeout: 5_000 });

    // Should show stage labels
    await expect(progress.locator('text=/Preparando|Preparing/')).toBeVisible();
  });

  test('analysis completes and shows results', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const analysisNav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await analysisNav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();

    // Wait for completion (stages take ~7.2s total)
    const results = page.getByTestId('analysis-results');
    await expect(results).toBeVisible({ timeout: 30_000 });

    // Should have summary
    const summary = page.getByTestId('analysis-summary');
    await expect(summary).toBeVisible();

    // Should have areas
    const areas = page.getByTestId('analysis-areas');
    await expect(areas).toBeVisible();

    // Should have opportunities
    const opportunities = page.getByTestId('analysis-opportunities');
    await expect(opportunities).toBeVisible();
  });

  test('analysis shows history section', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const analysisNav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await analysisNav.click();
    await page.waitForLoadState('networkidle');

    const history = page.getByTestId('analysis-history');
    await expect(history).toBeVisible({ timeout: 15_000 });
  });

  test('cancel button works during analysis', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const analysisNav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await analysisNav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();

    // Wait for progress
    const progress = page.getByTestId('analysis-progress');
    await expect(progress).toBeVisible({ timeout: 5_000 });

    // Click cancel
    const cancelBtn = page.getByRole('button', { name: /cancelar|cancel/i }).first();
    await cancelBtn.click();

    // Should show cancelled state
    await expect(page.getByText(/cancelado|cancelled/i)).toBeVisible({ timeout: 5_000 });
  });

  test('no dead buttons in analysis page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const analysisNav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await analysisNav.click();
    await page.waitForLoadState('networkidle');

    const analysisPage = page.getByTestId('analysis-page');
    await expect(analysisPage).toBeVisible({ timeout: 15_000 });

    // Start button should be clickable
    const startBtn = page.getByTestId('analysis-start');
    await expect(startBtn).toBeEnabled();
  });
});
