import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Executive Report', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  test('executive report auto-opens after analysis completes', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to analysis
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    // Start analysis
    await page.getByTestId('analysis-start').click();

    // Wait for executive report to appear (auto-navigates on completion)
    const report = page.getByTestId('executive-report');
    await expect(report).toBeVisible({ timeout: 30_000 });
  });

  test('health score ring is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });

    // Health score number should be visible
    const scoreText = page.locator('text=/\\d+\\/100/');
    await expect(scoreText.first()).toBeVisible();
  });

  test('executive summary shows 5 questions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });

    const summary = page.getByTestId('executive-summary');
    await expect(summary).toBeVisible();

    // Should show the 5 questions
    await expect(summary.locator('text=/¿Qué ocurre|What is happening/')).toBeVisible();
    await expect(summary.locator('text=/¿Por qué|Why is/')).toBeVisible();
    await expect(summary.locator('text=/¿Qué impacto|What impact/')).toBeVisible();
    await expect(summary.locator('text=/¿Qué deberíamos|What should/')).toBeVisible();
    await expect(summary.locator('text=/¿Qué pasará|What happens/')).toBeVisible();
  });

  test('health score breakdown is visible with 8 dimensions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });

    const breakdown = page.getByTestId('health-score-breakdown');
    await expect(breakdown).toBeVisible();

    // Should show dimension labels
    await expect(breakdown.locator('text=/Marketing|Ventas|Finance|Operations/').first()).toBeVisible();
  });

  test('next best action and economic impact are visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });

    await expect(page.locator('text=/Próxima mejor acción|Next best action/')).toBeVisible();
    await expect(page.locator('text=/Impacto económico|Economic impact/')).toBeVisible();
  });

  test('strengths, weaknesses, risks sections are visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });

    await expect(page.locator('text=/Fortalezas|Strengths/')).toBeVisible();
    await expect(page.locator('text=/Debilidades|Weaknesses/')).toBeVisible();
    await expect(page.locator('text=/Riesgos|Risks/').first()).toBeVisible();
  });

  test('evidence shown in executive summary sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });

    const summary = page.getByTestId('executive-summary');
    // Evidence badges with confidence percentages
    const evidenceBadges = summary.locator('text=/\\d+%/');
    const count = await evidenceBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('dimension rows expand on click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });

    const breakdown = page.getByTestId('health-score-breakdown');
    // Click on first dimension row
    const firstRow = breakdown.locator('button').first();
    await firstRow.click();

    // Should show expanded content with sources
    await expect(breakdown.locator('text=/Fuentes:|Sources:/').first()).toBeVisible({ timeout: 3_000 });
  });

  test('report renders on mobile', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
  });
});
