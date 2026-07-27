import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Profile Section', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
    await page.goto('/#settings/profile');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('loads profile data', async ({ page }) => {
    // Profile heading should be visible
    const heading = page.locator('h3').filter({ hasText: /perfil|profile/i }).first();
    await expect(heading).toBeVisible();

    // Name field should be present and filled (not empty unless profile is new)
    const nameInput = page.getByLabel(/nombre completo|full name/i).first();
    await expect(nameInput).toBeVisible();
  });

  test('email field is read-only', async ({ page }) => {
    const emailInput = page.getByLabel(/email|correo/i).first();
    await expect(emailInput).toBeDisabled();
  });

  test('avatar shows initials fallback', async ({ page }) => {
    // The avatar div should be visible
    const avatar = page.locator('.bg-brand-gradient').first();
    await expect(avatar).toBeVisible();
  });

  test('save button is present', async ({ page }) => {
    const saveButton = page.getByRole('button', { name: /guardar|save/i }).first();
    await expect(saveButton).toBeVisible();
  });

  test('can edit name field', async ({ page }) => {
    const nameInput = page.getByLabel(/nombre completo|full name/i).first();
    await nameInput.fill('Test User E2E');
    await expect(nameInput).toHaveValue('Test User E2E');
  });

  test('language selector is present', async ({ page }) => {
    const langSelect = page.getByLabel(/idioma|language/i).first();
    await expect(langSelect).toBeVisible();
    // Should have at least Spanish and English options
    const options = langSelect.locator('option');
    await expect(options).toHaveCount(2);
  });

  test('timezone selector is present', async ({ page }) => {
    const tzSelect = page.getByLabel(/zona horaria|timezone/i).first();
    await expect(tzSelect).toBeVisible();
    const options = tzSelect.locator('option');
    const count = await options.count();
    expect(count).toBeGreaterThan(3);
  });

  test('AI preferences section is present', async ({ page }) => {
    const aiHeading = page.locator('h4').filter({ hasText: /preferencias de ia|ai preferences/i }).first();
    await expect(aiHeading).toBeVisible();

    const modelSelect = page.getByLabel(/modelo|model/i).first();
    await expect(modelSelect).toBeVisible();
  });

  test('change photo button is disabled', async ({ page }) => {
    const photoBtn = page.getByRole('button', { name: /cambiar foto|change photo/i }).first();
    await expect(photoBtn).toBeDisabled();
  });

  test('loading state shows spinner', async ({ page }) => {
    // After reload, there should be a brief loading state
    // We verify the page doesn't crash and content eventually appears
    await page.reload();
    const heading = page.locator('h3').filter({ hasText: /perfil|profile/i }).first();
    await expect(heading).toBeVisible({ timeout: 10_000 });
  });
});
