import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Notifications Section', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
    await page.goto('/#settings/notifications');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('loads notifications section', async ({ page }) => {
    const heading = page.locator('h3').filter({ hasText: /notificaciones|notifications/i }).first();
    await expect(heading).toBeVisible();
  });

  test('shows email toggle', async ({ page }) => {
    const emailLabel = page.getByText(/correo electrónico|email/i).first();
    await expect(emailLabel).toBeVisible();
  });

  test('shows execution completed toggle', async ({ page }) => {
    const execLabel = page.getByText(/ejecuciones completadas|execution completed/i).first();
    await expect(execLabel).toBeVisible();
  });

  test('shows critical errors toggle', async ({ page }) => {
    const errorLabel = page.getByText(/errores críticos|critical errors/i).first();
    await expect(errorLabel).toBeVisible();
  });

  test('shows security alerts as mandatory', async ({ page }) => {
    const securityLabel = page.getByText(/alertas de seguridad|security alerts/i).first();
    await expect(securityLabel).toBeVisible();
    const mandatoryText = page.getByText(/obligatorio|mandatory/i).first();
    await expect(mandatoryText).toBeVisible();
  });

  test('security alerts has no toggle (is mandatory)', async ({ page }) => {
    // Find the security alerts row
    const securityRow = page.locator('text=/alertas de seguridad|security alerts/i').locator('..').locator('..');
    // Should NOT contain a switch button
    const switchBtn = securityRow.getByRole('switch');
    await expect(switchBtn).toHaveCount(0);
  });

  test('non-mandatory channels have toggle switches', async ({ page }) => {
    const switches = page.getByRole('switch');
    const count = await switches.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('save button is present', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /guardar|save/i }).first();
    await expect(saveBtn).toBeVisible();
  });

  test('can toggle a non-mandatory channel', async ({ page }) => {
    // Find automations toggle
    const automationsText = page.getByText(/automatizaciones|automations/i).first();
    const automationsRow = automationsText.locator('..').locator('..');
    const toggle = automationsRow.getByRole('switch').first();
    const ariaChecked = await toggle.getAttribute('aria-checked');
    await toggle.click();
    const newAriaChecked = await toggle.getAttribute('aria-checked');
    expect(ariaChecked).not.toEqual(newAriaChecked);
  });
});
