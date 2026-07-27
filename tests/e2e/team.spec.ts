import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Team Section', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
    await page.goto('/#settings/team');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('loads team section', async ({ page }) => {
    const heading = page.locator('h3').filter({ hasText: /equipo|team/i }).first();
    await expect(heading).toBeVisible();
  });

  test('shows members list or empty state', async ({ page }) => {
    // Either member rows or empty state message
    const memberRow = page.locator('.bg-surface-750 .flex.items-center.justify-between').first();
    const emptyState = page.getByText(/no hay miembros|no members/i).first();
    // One of them should be visible
    const memberVisible = await memberRow.isVisible({ timeout: 3_000 }).catch(() => false);
    const emptyVisible = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(memberVisible || emptyVisible).toBeTruthy();
  });

  test('invite button is disabled', async ({ page }) => {
    const inviteBtn = page.getByRole('button', { name: /invitar|invite/i }).first();
    await expect(inviteBtn).toBeVisible();
    await expect(inviteBtn).toBeDisabled();
  });

  test('confirm dialog appears for destructive actions', async ({ page }) => {
    // Find a remove button (trash icon) if members exist
    const removeBtn = page.getByTitle(/eliminar miembro|remove member/i).first();
    const isVisible = await removeBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (isVisible) {
      await removeBtn.click();
      // Confirmation dialog should appear
      const confirmDialog = page.locator('.fixed.inset-0').first();
      await expect(confirmDialog).toBeVisible();
      // Cancel button should be present
      const cancelBtn = page.getByRole('button', { name: /cancelar|cancel/i }).first();
      await expect(cancelBtn).toBeVisible();
      await cancelBtn.click();
    }
  });
});
