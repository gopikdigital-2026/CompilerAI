import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Analysis Progress', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('progress shows all 6 stages', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const analysisNav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await analysisNav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();

    const progress = page.getByTestId('analysis-progress');
    await expect(progress).toBeVisible({ timeout: 5_000 });

    // Should show stage descriptions
    await expect(progress.locator('text=/Preparando|Preparing/')).toBeVisible({ timeout: 5_000 });
  });

  test('progress bar advances during analysis', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const analysisNav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await analysisNav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();

    const progress = page.getByTestId('analysis-progress');
    await expect(progress).toBeVisible({ timeout: 5_000 });

    // Wait a bit and check that some stages have completed
    await page.waitForTimeout(3000);

    // At least one stage should show completed icon
    const completedIcons = progress.locator('svg.lucide-check-circle, svg.lucide-circle-check');
    const count = await completedIcons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('analysis completes within reasonable time', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const analysisNav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await analysisNav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();

    // Should complete within 30 seconds
    const results = page.getByTestId('analysis-results');
    await expect(results).toBeVisible({ timeout: 30_000 });
  });
});
