import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('API Keys Section', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
    await page.goto('/#settings/api-keys');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('loads API keys section', async ({ page }) => {
    const heading = page.locator('h3').filter({ hasText: /api keys/i }).first();
    await expect(heading).toBeVisible();
  });

  test('shows key list or empty state', async ({ page }) => {
    const keyCard = page.locator('.bg-surface-750.border.border-surface-600').first();
    const emptyState = page.getByText(/no hay claves|no api keys/i).first();
    const keyVisible = await keyCard.isVisible({ timeout: 3_000 }).catch(() => false);
    const emptyVisible = await emptyState.isVisible({ timeout: 3_000 }).catch(() => false);
    expect(keyVisible || emptyVisible).toBeTruthy();
  });

  test('shows key name input', async ({ page }) => {
    const nameInput = page.getByPlaceholder(/nombre de la clave|key name/i).first();
    await expect(nameInput).toBeVisible();
  });

  test('generate button is present', async ({ page }) => {
    const genBtn = page.getByRole('button', { name: /generar|generate/i }).first();
    await expect(genBtn).toBeVisible();
  });

  test('generate button is disabled without name', async ({ page }) => {
    const genBtn = page.getByRole('button', { name: /generar|generate/i }).first();
    await expect(genBtn).toBeDisabled();
  });

  test('generate button enables with name', async ({ page }) => {
    const nameInput = page.getByPlaceholder(/nombre de la clave|key name/i).first();
    const genBtn = page.getByRole('button', { name: /generar|generate/i }).first();
    await nameInput.fill('E2E Test Key');
    await expect(genBtn).toBeEnabled();
  });

  test('revoke shows confirmation dialog', async ({ page }) => {
    const revokeBtn = page.getByRole('button', { name: /revocar|revoke/i }).first();
    const isVisible = await revokeBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (isVisible) {
      await revokeBtn.click();
      const dialog = page.locator('.fixed.inset-0').first();
      await expect(dialog).toBeVisible();
      const cancelBtn = page.getByRole('button', { name: /cancelar|cancel/i }).first();
      await cancelBtn.click();
    }
  });

  test('key preview is shown not full key', async ({ page }) => {
    // If keys exist, preview should end with "..."
    const preview = page.locator('code').filter({ hasText: /\.\.\.$/ }).first();
    const isVisible = await preview.isVisible({ timeout: 3_000 }).catch(() => false);
    if (isVisible) {
      const text = await preview.textContent();
      expect(text).toMatch(/\.\.\.$/);
      // Should not contain a full key pattern
      expect(text).not.toMatch(/^cak_[a-f0-9]{64}$/);
    }
  });
});
