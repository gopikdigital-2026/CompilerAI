import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Billing Section', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
    await page.goto('/#settings/billing');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('loads billing section', async ({ page }) => {
    const heading = page.locator('h3').filter({ hasText: /facturación|billing/i }).first();
    await expect(heading).toBeVisible();
  });

  test('shows not-configured state', async ({ page }) => {
    const notConfigured = page.getByText(/no configurada|not configured/i).first();
    await expect(notConfigured).toBeVisible();
  });

  test('shows required environment variables', async ({ page }) => {
    const stripeVar = page.getByText(/VITE_STRIPE_PUBLISHABLE_KEY/i).first();
    await expect(stripeVar).toBeVisible();
  });

  test('shows demo view with label', async ({ page }) => {
    const demoLabel = page.getByText(/demostración|demo/i).first();
    await expect(demoLabel).toBeVisible();
  });

  test('demo view shows current plan', async ({ page }) => {
    const planLabel = page.getByText(/plan actual|current plan/i).first();
    await expect(planLabel).toBeVisible();
  });

  test('demo view states simulated data', async ({ page }) => {
    const simulatedLabel = page.getByText(/simulado|simulated/i).first();
    await expect(simulatedLabel).toBeVisible();
  });

  test('no fake upgrade buttons enabled', async ({ page }) => {
    // No enabled upgrade/pay buttons should exist
    const upgradeBtn = page.getByRole('button', { name: /upgrade|mejorar/i }).first();
    const isVisible = await upgradeBtn.isVisible({ timeout: 2_000 }).catch(() => false);
    if (isVisible) {
      await expect(upgradeBtn).toBeDisabled();
    }
  });
});
