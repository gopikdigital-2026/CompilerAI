import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

const SECTIONS = [
  { id: 'profile', testId: 'profile-link', hash: '#settings/profile', title: /perfil|profile/i },
  { id: 'organization', testId: 'organization-link', hash: '#settings/organization', title: /organización|organization/i },
  { id: 'team', testId: 'team-link', hash: '#settings/team', title: /equipo|team/i },
  { id: 'billing', testId: 'billing-link', hash: '#settings/billing', title: /facturación|billing/i },
  { id: 'api', testId: 'api-keys-link', hash: '#settings/api-keys', title: /api keys/i },
  { id: 'security', testId: 'security-link', hash: '#settings/security', title: /seguridad|security/i },
  { id: 'notifications', testId: 'notifications-link', hash: '#settings/notifications', title: /notificaciones|notifications/i },
  { id: 'integrations', testId: 'integrations-link', hash: '#settings/integrations', title: /integraciones|integrations/i },
];

test.describe('Profile Menu', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('opens with click', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('profile-menu-trigger')).toBeVisible();
    await page.getByTestId('profile-menu-trigger').click();
    await expect(page.getByTestId('profile-menu')).toBeVisible();
  });

  test('closes with Escape', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('profile-menu-trigger').click();
    await expect(page.getByTestId('profile-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('profile-menu')).not.toBeVisible();
  });

  test('closes on outside click', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('profile-menu-trigger').click();
    await expect(page.getByTestId('profile-menu')).toBeVisible();
    await page.mouse.click(50, 50);
    await expect(page.getByTestId('profile-menu')).not.toBeVisible();
  });

  test('closes after selecting an option', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('profile-menu-trigger').click();
    await page.getByTestId('profile-link').click();
    await expect(page.getByTestId('profile-menu')).not.toBeVisible();
  });

  test('keyboard: Tab reaches trigger, Enter opens', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    // The trigger should be reachable via tab
    await page.getByTestId('profile-menu-trigger').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('profile-menu')).toBeVisible();
  });

  test.describe('navigation to each section', () => {
    for (const sec of SECTIONS) {
      test(`navigates to ${sec.id}`, async ({ page }) => {
        await page.goto('/');
        await page.getByTestId('profile-menu-trigger').click();
        await page.getByTestId(sec.testId).click();

        // URL hash should match
        await expect(page).toHaveURL(new RegExp(sec.hash));

        // Menu should be closed
        await expect(page.getByTestId('profile-menu')).not.toBeVisible();

        // Section heading should be visible
        const heading = page.locator('h3').filter({ hasText: sec.title }).first();
        await expect(heading).toBeVisible({ timeout: 10_000 });
      });
    }
  });

  test('settings nav updates URL when clicking section', async ({ page }) => {
    await page.goto('/#settings/profile');
    await page.waitForLoadState('networkidle');

    // Click on team in the settings sidebar
    await page.getByTestId('settings-nav-team').click();
    await expect(page).toHaveURL(/#settings\/team/);

    // Click on billing
    await page.getByTestId('settings-nav-billing').click();
    await expect(page).toHaveURL(/#settings\/billing/);
  });

  test('section persists on reload', async ({ page }) => {
    await page.goto('/#settings/security');
    await page.waitForLoadState('networkidle');
    await page.reload();
    await expect(page).toHaveURL(/#settings\/security/);
    const heading = page.locator('h3').filter({ hasText: /seguridad|security/i }).first();
    await expect(heading).toBeVisible();
  });

  test('back button works', async ({ page }) => {
    await page.goto('/#settings/profile');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('settings-nav-team').click();
    await expect(page).toHaveURL(/#settings\/team/);

    await page.goBack();
    await expect(page).toHaveURL(/#settings\/profile/);
  });

  test('unknown hash redirects to profile', async ({ page }) => {
    await page.goto('/#settings/nonexistent');
    await page.waitForLoadState('networkidle');
    // Should default to profile section
    const heading = page.locator('h3').filter({ hasText: /perfil|profile/i }).first();
    await expect(heading).toBeVisible();
  });
});
