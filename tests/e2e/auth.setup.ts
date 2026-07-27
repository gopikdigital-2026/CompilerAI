import { test as setup, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

const E2E_EMAIL = process.env.E2E_USER_EMAIL;
const E2E_PASSWORD = process.env.E2E_USER_PASSWORD;
const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

setup('authenticate', async ({ page }) => {
  attachConsoleErrorCapture(page);

  if (!E2E_EMAIL || !E2E_PASSWORD) {
    throw new Error(
      'E2E_USER_EMAIL and E2E_USER_PASSWORD environment variables are required for E2E tests. ' +
      'Do not use production credentials. Create a test user in your Supabase project.',
    );
  }

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');

  // If already authenticated, save state and return
  const profileTrigger = page.getByTestId('profile-menu-trigger');
  if (await profileTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.context().storageState({ path: 'tests/e2e/.auth/state.json' });
    return;
  }

  // Fill login form
  const emailInput = page.getByLabel(/email|correo/i).first();
  const passwordInput = page.getByLabel(/password|contraseña/i).first();
  await emailInput.fill(E2E_EMAIL);
  await passwordInput.fill(E2E_PASSWORD);

  await page.getByRole('button', { name: /sign in|iniciar sesión/i }).click();

  // Wait for dashboard to load
  await expect(page.getByTestId('profile-menu-trigger')).toBeVisible({ timeout: 15_000 });

  assertNoCriticalErrors();
  await page.context().storageState({ path: 'tests/e2e/.auth/state.json' });
});
