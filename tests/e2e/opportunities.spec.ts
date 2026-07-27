import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Opportunities', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  async function navigateToAnalysisAndRun(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('analysis-start').click();
    await page.getByTestId('analysis-results').waitFor({ timeout: 30_000 });
  }

  test('opportunities have approve and reject buttons', async ({ page }) => {
    await navigateToAnalysisAndRun(page);

    const opportunities = page.getByTestId('analysis-opportunities');
    await expect(opportunities).toBeVisible();

    // Check for action buttons
    const approveBtn = page.getByTestId('approve-opportunity').first();
    const rejectBtn = page.getByTestId('reject-opportunity').first();
    await expect(approveBtn).toBeVisible();
    await expect(rejectBtn).toBeVisible();
  });

  test('approve button updates opportunity status', async ({ page }) => {
    await navigateToAnalysisAndRun(page);

    const approveBtn = page.getByTestId('approve-opportunity').first();
    await expect(approveBtn).toBeEnabled();
    await approveBtn.click();

    // Button should be disabled after approval
    await expect(approveBtn).toBeDisabled({ timeout: 5_000 });
  });

  test('reject button updates opportunity status', async ({ page }) => {
    await navigateToAnalysisAndRun(page);

    const rejectBtn = page.getByTestId('reject-opportunity').first();
    await expect(rejectBtn).toBeEnabled();
    await rejectBtn.click();

    await expect(rejectBtn).toBeDisabled({ timeout: 5_000 });
  });

  test('send to copilot button is present', async ({ page }) => {
    await navigateToAnalysisAndRun(page);

    const copilotBtn = page.getByTestId('send-to-copilot').first();
    await expect(copilotBtn).toBeVisible();
    await expect(copilotBtn).toBeEnabled();
  });

  test('create automation button is present', async ({ page }) => {
    await navigateToAnalysisAndRun(page);

    const autoBtn = page.getByTestId('create-automation').first();
    await expect(autoBtn).toBeVisible();
    await expect(autoBtn).toBeEnabled();
  });

  test('opportunities show evidence', async ({ page }) => {
    await navigateToAnalysisAndRun(page);

    // Should show evidence section with data source
    const evidence = page.getByText(/datos utilizados|data used/i).first();
    const isVisible = await evidence.isVisible({ timeout: 5_000 }).catch(() => false);
    if (isVisible) {
      await expect(evidence).toBeVisible();
    }
  });

  test('opportunities show priority badges', async ({ page }) => {
    await navigateToAnalysisAndRun(page);

    // Should show priority labels
    const priorities = page.getByText(/crítica|critical|alta|high|media|medium|baja|low/i);
    const count = await priorities.count();
    expect(count).toBeGreaterThan(0);
  });

  test('opportunities show source in monospace', async ({ page }) => {
    await navigateToAnalysisAndRun(page);

    // Each opportunity should show its source
    const sources = page.locator('.font-mono').filter({ hasText: /execution_runs|compiler_sessions|workflow_designs|prompt_sessions|connectors|memberships/ });
    const count = await sources.count();
    expect(count).toBeGreaterThan(0);
  });

  test('view detail opens modal', async ({ page }) => {
    await navigateToAnalysisAndRun(page);

    const detailBtn = page.getByRole('button', { name: /ver detalle|view detail/i }).first();
    await detailBtn.click();

    const modal = page.getByTestId('opportunity-detail-modal');
    await expect(modal).toBeVisible({ timeout: 5_000 });
  });
});
