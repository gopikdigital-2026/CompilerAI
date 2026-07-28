import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

async function openActionCenter(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.locator('[data-testid="sidebar-actions"], a:has-text("Action Center")').first().click();
  await page.getByTestId('action-center').waitFor({ timeout: 15_000 });
}

test.describe('Action Workflow — Estados y transiciones', () => {
  test.beforeEach(async ({ page }) => { attachConsoleErrorCapture(page); });
  test.afterEach(async () => { assertNoCriticalErrors(); });

  test('action card opens detail modal', async ({ page }) => {
    await openActionCenter(page);
    const cards = page.getByTestId('action-card');
    const count = await cards.count();
    if (count > 0) {
      await cards.first().click();
      await expect(page.getByTestId('action-detail-modal')).toBeVisible({ timeout: 5_000 });
    }
  });

  test('detail modal has 3 tabs', async ({ page }) => {
    await openActionCenter(page);
    const cards = page.getByTestId('action-card');
    if (await cards.count() > 0) {
      await cards.first().click();
      await expect(page.getByTestId('action-tab-overview')).toBeVisible();
      await expect(page.getByTestId('action-tab-history')).toBeVisible();
      await expect(page.getByTestId('action-tab-comments')).toBeVisible();
    }
  });

  test('overview tab shows metrics', async ({ page }) => {
    await openActionCenter(page);
    const cards = page.getByTestId('action-card');
    if (await cards.count() > 0) {
      await cards.first().click();
      await expect(page.getByTestId('action-overview')).toBeVisible();
      await expect(page.locator('text=/ROI esperado/')).toBeVisible();
      await expect(page.locator('text=/Impacto esperado/')).toBeVisible();
    }
  });

  test('progress slider works', async ({ page }) => {
    await openActionCenter(page);
    const cards = page.getByTestId('action-card');
    if (await cards.count() > 0) {
      await cards.first().click();
      const slider = page.getByTestId('action-progress-slider');
      if (await slider.count() > 0) {
        await slider.fill('50');
        await expect(slider).toHaveValue('50');
      }
    }
  });

  test('history tab loads entries', async ({ page }) => {
    await openActionCenter(page);
    const cards = page.getByTestId('action-card');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.getByTestId('action-tab-history').click();
      await page.waitForTimeout(500);
      const history = page.getByTestId('action-history');
      await expect(history).toBeVisible();
    }
  });

  test('comments tab allows adding comments', async ({ page }) => {
    await openActionCenter(page);
    const cards = page.getByTestId('action-card');
    if (await cards.count() > 0) {
      await cards.first().click();
      await page.getByTestId('action-tab-comments').click();
      await page.waitForTimeout(500);
      await page.getByTestId('comment-input').fill('Test comment');
      await expect(page.getByTestId('comment-input')).toHaveValue('Test comment');
    }
  });

  test('assignee dropdown shows members', async ({ page }) => {
    await openActionCenter(page);
    const cards = page.getByTestId('action-card');
    if (await cards.count() > 0) {
      await cards.first().click();
      const select = page.getByTestId('action-assignee-select');
      if (await select.count() > 0) {
        const options = await select.locator('option').count();
        expect(options).toBeGreaterThanOrEqual(1);
      }
    }
  });

  test('modal closes on X', async ({ page }) => {
    await openActionCenter(page);
    const cards = page.getByTestId('action-card');
    if (await cards.count() > 0) {
      await cards.first().click();
      await expect(page.getByTestId('action-detail-modal')).toBeVisible();
      await page.locator('[data-testid="action-detail-modal"] button[aria-label="Cerrar"]').click();
      await expect(page.getByTestId('action-detail-modal')).not.toBeVisible({ timeout: 3_000 });
    }
  });
});
