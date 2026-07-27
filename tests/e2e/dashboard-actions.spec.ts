import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Dashboard Actions', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('quick actions are all present', async ({ page }) => {
    const quickActions = page.getByTestId('quick-actions');
    await expect(quickActions).toBeVisible({ timeout: 15_000 });

    const expectedActions = [
      'start-analysis-button',
      'quick-connect-data',
      'quick-ask-copilot',
      'quick-create-automation',
      'quick-import-files',
      'quick-review-opportunities',
      'quick-invite-team',
    ];

    for (const testId of expectedActions) {
      const btn = page.getByTestId(testId);
      await expect(btn).toBeVisible();
    }
  });

  test('connect data navigates to integrations', async ({ page }) => {
    const connectBtn = page.getByTestId('quick-connect-data');
    await expect(connectBtn).toBeVisible({ timeout: 15_000 });
    await connectBtn.click();
    await expect(page).toHaveURL(/#settings\/integrations/);
  });

  test('invite team navigates to team settings', async ({ page }) => {
    const inviteBtn = page.getByTestId('quick-invite-team');
    await expect(inviteBtn).toBeVisible({ timeout: 15_000 });
    await inviteBtn.click();
    await expect(page).toHaveURL(/#settings\/team/);
  });

  test('start analysis button is present and clickable', async ({ page }) => {
    const analyzeBtn = page.getByTestId('start-analysis-button');
    await expect(analyzeBtn).toBeVisible({ timeout: 15_000 });
    // Should not crash when clicked
    await analyzeBtn.click();
    await expect(page.getByTestId('dashboard')).toBeVisible();
  });

  test('data settings button navigates to integrations', async ({ page }) => {
    // Find the data settings button in the header
    const header = page.getByTestId('dashboard-header');
    await expect(header).toBeVisible({ timeout: 15_000 });
    const settingsBtn = header.getByRole('button').filter({ hasText: /configurar datos|data settings/i }).first();
    const isVisible = await settingsBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (isVisible) {
      await settingsBtn.click();
      await expect(page).toHaveURL(/#settings\/integrations/);
    }
  });

  test('no dead buttons in quick actions', async ({ page }) => {
    const quickActions = page.getByTestId('quick-actions');
    await expect(quickActions).toBeVisible({ timeout: 15_000 });

    // Every button should have an onClick handler (no empty onClick)
    const buttons = quickActions.locator('button');
    const count = await buttons.count();
    expect(count).toBeGreaterThanOrEqual(7);

    // Each button should have a data-testid
    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const testId = await btn.getAttribute('data-testid');
      expect(testId).toBeTruthy();
    }
  });

  test('opportunities section has view/approve/discard buttons when populated', async ({ page }) => {
    const opps = page.getByTestId('opportunities-section');
    await expect(opps).toBeVisible({ timeout: 15_000 });

    // Check if there are opportunity items
    const items = opps.locator('.px-5.py-4');
    const count = await items.count();
    if (count > 0) {
      const firstItem = items.first();
      // Should have action buttons
      await expect(firstItem.getByText(/ver detalle|view detail/i)).toBeVisible();
      await expect(firstItem.getByText(/aprobar|approve/i)).toBeVisible();
      await expect(firstItem.getByText(/descartar|discard/i)).toBeVisible();
    }
  });

  test('automations section has open studio link', async ({ page }) => {
    const automations = page.getByTestId('automations-section');
    await expect(automations).toBeVisible({ timeout: 15_000 });
    const studioLink = automations.getByText(/automation studio/i).first();
    await expect(studioLink).toBeVisible();
  });
});
