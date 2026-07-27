import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Automation from Analysis', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('create automation button updates opportunity status', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();
    await page.getByTestId('analysis-results').waitFor({ timeout: 30_000 });

    const autoBtn = page.getByTestId('create-automation').first();
    await autoBtn.click();

    // Status should update to show it was automated
    const autoBadge = page.getByText(/automatizada|automated/i).first();
    await expect(autoBadge).toBeVisible({ timeout: 5_000 });
  });
});
