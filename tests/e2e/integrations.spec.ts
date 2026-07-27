import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Integrations Section', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
    await page.goto('/#settings/integrations');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('loads integrations section', async ({ page }) => {
    const heading = page.locator('h3').filter({ hasText: /integraciones|integrations/i }).first();
    await expect(heading).toBeVisible();
  });

  test('shows GitHub integration', async ({ page }) => {
    const github = page.getByText('GitHub').first();
    await expect(github).toBeVisible();
  });

  test('shows Google Workspace integration', async ({ page }) => {
    const google = page.getByText('Google Workspace').first();
    await expect(google).toBeVisible();
  });

  test('shows Slack integration', async ({ page }) => {
    const slack = page.getByText('Slack').first();
    await expect(slack).toBeVisible();
  });

  test('shows at least 8 integrations', async ({ page }) => {
    const connectBtns = page.getByRole('button', { name: /conectar|connect/i });
    const count = await connectBtns.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('all connect buttons are disabled', async ({ page }) => {
    const connectBtns = page.getByRole('button', { name: /conectar|connect/i });
    const count = await connectBtns.count();
    for (let i = 0; i < count; i++) {
      await expect(connectBtns.nth(i)).toBeDisabled();
    }
  });

  test('all integrations show as disconnected', async ({ page }) => {
    const disconnectedLabels = page.getByText(/desconectada|disconnected/i);
    const count = await disconnectedLabels.count();
    expect(count).toBeGreaterThanOrEqual(8);
  });

  test('shows configuration required message', async ({ page }) => {
    const configMsg = page.getByText(/configuración del servidor|server configuration/i).first();
    await expect(configMsg).toBeVisible();
  });

  test('no integration shows as connected', async ({ page }) => {
    const connectedLabels = page.getByText(/conectada|connected/i);
    const count = await connectedLabels.count();
    expect(count).toBe(0);
  });
});
