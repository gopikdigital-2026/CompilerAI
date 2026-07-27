import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Security Section', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
    await page.goto('/#settings/security');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('loads security section', async ({ page }) => {
    const heading = page.locator('h3').filter({ hasText: /seguridad|security/i }).first();
    await expect(heading).toBeVisible();
  });

  test('shows email verification status', async ({ page }) => {
    const emailLabel = page.getByText(/verificación de correo|email verification/i).first();
    await expect(emailLabel).toBeVisible();
    // Should show verified or pending
    const status = page.getByText(/verificado|verified|pendiente|pending/i).first();
    await expect(status).toBeVisible();
  });

  test('shows change password form', async ({ page }) => {
    const pwdHeading = page.locator('h4').filter({ hasText: /cambiar contraseña|change password/i }).first();
    await expect(pwdHeading).toBeVisible();

    const currentInput = page.getByLabel(/actual|current/i).first();
    await expect(currentInput).toBeVisible();

    const newInput = page.getByLabel(/nueva|new/i).first();
    await expect(newInput).toBeVisible();

    const confirmInput = page.getByLabel(/confirmar|confirm/i).first();
    await expect(confirmInput).toBeVisible();
  });

  test('update password button is disabled without input', async ({ page }) => {
    const updateBtn = page.getByRole('button', { name: /actualizar contraseña|update password/i }).first();
    await expect(updateBtn).toBeDisabled();
  });

  test('update password enables with input', async ({ page }) => {
    const newInput = page.getByLabel(/nueva|new/i).first();
    const confirmInput = page.getByLabel(/confirmar|confirm/i).first();
    const updateBtn = page.getByRole('button', { name: /actualizar contraseña|update password/i }).first();
    await newInput.fill('testpass123');
    await confirmInput.fill('testpass123');
    await expect(updateBtn).toBeEnabled();
  });

  test('MFA button is disabled', async ({ page }) => {
    const mfaBtn = page.getByRole('button', { name: /configurar|set up/i }).first();
    await expect(mfaBtn).toBeDisabled();
  });

  test('MFA shows not configured', async ({ page }) => {
    const mfaStatus = page.getByText(/no configurada|not configured/i).first();
    await expect(mfaStatus).toBeVisible();
  });

  test('sign out all sessions button is present', async ({ page }) => {
    const signOutBtn = page.getByRole('button', { name: /cerrar todas|sign out all/i }).first();
    await expect(signOutBtn).toBeVisible();
  });

  test('sign out all shows confirmation', async ({ page }) => {
    const signOutBtn = page.getByRole('button', { name: /cerrar todas|sign out all/i }).first();
    await signOutBtn.click();
    const dialog = page.locator('.fixed.inset-0').first();
    await expect(dialog).toBeVisible();
    const cancelBtn = page.getByRole('button', { name: /cancelar|cancel/i }).first();
    await cancelBtn.click();
  });
});
