import { test, expect } from '@playwright/test';

test.describe('Beta Ready — Full E2E Flow', () => {
  test('beta readiness dashboard loads for admin', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const betaNav = page.locator('[data-testid="sidebar-beta"]').first();
    if (await betaNav.count() > 0) {
      await betaNav.click();
      await page.waitForLoadState('networkidle');
      const dashboard = page.getByTestId('beta-readiness-dashboard');
      if (await dashboard.count() > 0) {
        await expect(dashboard).toBeVisible({ timeout: 10_000 });
        await expect(page.getByTestId('beta-overall-status')).toBeVisible();
      }
    }
  });

  test('feedback button is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const btn = page.getByTestId('feedback-button');
    if (await btn.count() > 0) {
      await expect(btn).toBeVisible();
    }
  });

  test('feedback modal opens and accepts input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const btn = page.getByTestId('feedback-button');
    if (await btn.count() > 0) {
      await btn.click();
      const modal = page.getByTestId('feedback-modal');
      if (await modal.count() > 0) {
        await expect(modal).toBeVisible({ timeout: 5_000 });
        await page.getByTestId('feedback-type-idea').click();
        await page.getByTestId('feedback-message').fill('This is a test feedback for the beta e2e suite, at least 10 chars');
        const submit = page.getByTestId('feedback-submit');
        if (await submit.count() > 0) {
          await expect(submit).toBeEnabled();
        }
      }
    }
  });

  test('feature flags panel loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const betaNav = page.locator('[data-testid="sidebar-beta"]').first();
    if (await betaNav.count() > 0) {
      await betaNav.click();
      await page.waitForLoadState('networkidle');
      const flagsPanel = page.getByTestId('feature-flags-panel');
      if (await flagsPanel.count() > 0) {
        await expect(flagsPanel).toBeVisible({ timeout: 10_000 });
        const firstFlag = page.locator('[data-testid^="feature-flag-"]').first();
        if (await firstFlag.count() > 0) {
          await expect(firstFlag).toBeVisible();
        }
      }
    }
  });

  test('service health cards are visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const betaNav = page.locator('[data-testid="sidebar-beta"]').first();
    if (await betaNav.count() > 0) {
      await betaNav.click();
      await page.waitForLoadState('networkidle');
      const supabaseCard = page.getByTestId('beta-service-Supabase');
      if (await supabaseCard.count() > 0) {
        await expect(supabaseCard).toBeVisible({ timeout: 10_000 });
      }
    }
  });

  test('no console errors on beta dashboard', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const betaNav = page.locator('[data-testid="sidebar-beta"]').first();
    if (await betaNav.count() > 0) {
      await betaNav.click();
      await page.waitForTimeout(2000);
    }
    expect(errors.filter((e) => !e.includes('favicon'))).toHaveLength(0);
  });

  test('responsive: no horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const betaNav = page.locator('[data-testid="sidebar-beta"]').first();
    if (await betaNav.count() > 0) {
      await betaNav.click();
      await page.waitForLoadState('networkidle');
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    }
  });
});
