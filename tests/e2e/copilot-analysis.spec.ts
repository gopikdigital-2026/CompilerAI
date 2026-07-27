import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Copilot Analysis Integration', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('send to copilot button updates opportunity status', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();
    await page.getByTestId('analysis-results').waitFor({ timeout: 30_000 });

    const copilotBtn = page.getByTestId('send-to-copilot').first();
    await copilotBtn.click();

    // Status should update to show it was sent
    const sentBadge = page.getByText(/enviado al copilot|sent to copilot/i).first();
    await expect(sentBadge).toBeVisible({ timeout: 5_000 });
  });
});
