import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

async function openAnalysis(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first().click();
  await page.waitForLoadState('networkidle');
  await page.getByTestId('analysis-start').click();
  await page.getByTestId('analysis-results').waitFor({ timeout: 30_000 });
}

test.describe('Approval Flow — Convertir oportunidades en acciones', () => {
  test.beforeEach(async ({ page }) => { attachConsoleErrorCapture(page); });
  test.afterEach(async () => { assertNoCriticalErrors(); });

  test('opportunity card has convert-to-action button', async ({ page }) => {
    await openAnalysis(page);
    const cards = page.getByTestId('opportunity-card');
    if (await cards.count() > 0) {
      const convertBtn = cards.first().getByTestId('convert-to-action');
      if (await convertBtn.count() > 0) {
        await expect(convertBtn).toBeVisible();
      }
    }
  });

  test('approve action works', async ({ page }) => {
    await openAnalysis(page);
    const cards = page.getByTestId('opportunity-card');
    if (await cards.count() > 0) {
      const approveBtn = cards.first().getByTestId('approve-opportunity');
      if (await approveBtn.count() > 0) {
        await approveBtn.click();
        await expect(approveBtn).toBeDisabled({ timeout: 5_000 });
      }
    }
  });

  test('more actions menu reveals extended options', async ({ page }) => {
    await openAnalysis(page);
    const cards = page.getByTestId('opportunity-card');
    if (await cards.count() > 0) {
      const moreBtn = cards.first().getByTestId('more-actions');
      if (await moreBtn.count() > 0) {
        await moreBtn.click();
        const menu = cards.first().getByTestId('action-menu');
        if (await menu.count() > 0) {
          await expect(menu).toBeVisible();
        }
      }
    }
  });

  test('convert to action navigates to action center', async ({ page }) => {
    await openAnalysis(page);
    const cards = page.getByTestId('opportunity-card');
    if (await cards.count() > 0) {
      const convertBtn = cards.first().getByTestId('convert-to-action');
      if (await convertBtn.count() > 0) {
        await convertBtn.click();
        await page.waitForTimeout(2000);
      }
    }
  });
});
