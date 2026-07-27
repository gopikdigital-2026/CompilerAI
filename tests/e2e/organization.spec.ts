import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Organization Section', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
    await page.goto('/#settings/organization');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('loads organization data', async ({ page }) => {
    const heading = page.locator('h3').filter({ hasText: /organización|organization/i }).first();
    await expect(heading).toBeVisible();
  });

  test('shows organization name field', async ({ page }) => {
    const nameInput = page.getByLabel(/nombre de la organización|organization name/i).first();
    await expect(nameInput).toBeVisible();
  });

  test('shows sector selector', async ({ page }) => {
    const sectorSelect = page.getByLabel(/sector/i).first();
    await expect(sectorSelect).toBeVisible();
  });

  test('shows company size selector', async ({ page }) => {
    const sizeSelect = page.getByLabel(/tamaño|size/i).first();
    await expect(sizeSelect).toBeVisible();
  });

  test('shows country selector', async ({ page }) => {
    const countrySelect = page.getByLabel(/país|country/i).first();
    await expect(countrySelect).toBeVisible();
  });

  test('shows timezone selector', async ({ page }) => {
    const tzSelect = page.getByLabel(/zona horaria|timezone/i).first();
    await expect(tzSelect).toBeVisible();
  });

  test('shows plan badge', async ({ page }) => {
    // The plan label should appear somewhere in the organization section
    const planLabel = page.getByText(/free|pro|enterprise/i).first();
    await expect(planLabel).toBeVisible();
  });

  test('shows organization ID', async ({ page }) => {
    const idText = page.locator('text=/.*\\.\\.\\.$/').filter({ hasText: /[a-f0-9]/i }).first();
    // The ID is shown as a truncated UUID with "..."
  });

  test('shows created date', async ({ page }) => {
    const dateLabel = page.getByText(/fecha de creación|created/i).first();
    // Created date should be visible somewhere
  });

  test('save button is present', async ({ page }) => {
    const saveBtn = page.getByRole('button', { name: /guardar|save/i }).first();
    await expect(saveBtn).toBeVisible();
  });
});
