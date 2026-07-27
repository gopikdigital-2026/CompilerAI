import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Executive Copilot', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  async function openReport(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });
  }

  test('copilot button opens panel', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-copilot').click();
    await expect(page.getByTestId('copilot-panel')).toBeVisible();
  });

  test('copilot shows 9 suggested questions', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-copilot').click();
    const panel = page.getByTestId('copilot-panel');
    await expect(panel.locator('[data-testid^="copilot-question-"]')).toHaveCount(9);
  });

  test('copilot answers a question with citations', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-copilot').click();
    await page.getByTestId('copilot-question-what_first').click();
    await expect(page.getByTestId('copilot-answer')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('copilot-citations')).toBeVisible();
  });

  test('copilot answer cites evidence sources', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-copilot').click();
    await page.getByTestId('copilot-question-biggest_problem').click();
    await expect(page.getByTestId('copilot-answer')).toBeVisible({ timeout: 5_000 });
    const citations = page.getByTestId('copilot-citations');
    await expect(citations.locator('text=/\\d+%/')).toBeVisible();
  });

  test('copilot can answer multiple questions', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-copilot').click();
    await page.getByTestId('copilot-question-what_first').click();
    await expect(page.getByTestId('copilot-answer')).toBeVisible({ timeout: 5_000 });
    await page.getByText('Hacer otra pregunta').click();
    await page.getByTestId('copilot-question-expected_roi').click();
    await expect(page.getByTestId('copilot-answer')).toBeVisible({ timeout: 5_000 });
  });

  test('copilot panel closes on X', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-copilot').click();
    await expect(page.getByTestId('copilot-panel')).toBeVisible();
    await page.getByTestId('copilot-panel').locator('button:has(svg)').first().click();
    await expect(page.getByTestId('copilot-panel')).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe('Roadmap', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  async function openReport(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });
  }

  test('roadmap tab is visible', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('report-tab-roadmap').click();
    await expect(page.getByTestId('roadmap-view')).toBeVisible();
  });

  test('roadmap shows 3 phases', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('report-tab-roadmap').click();
    await expect(page.getByTestId('roadmap-phase-7days')).toBeVisible();
    await expect(page.getByTestId('roadmap-phase-30days')).toBeVisible();
    await expect(page.getByTestId('roadmap-phase-90days')).toBeVisible();
  });

  test('each phase shows objective, actions, impact, owner', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('report-tab-roadmap').click();
    const phase = page.getByTestId('roadmap-phase-7days');
    await expect(phase.locator('text=/Objetivo/')).toBeVisible();
    await expect(phase.locator('text=/Acciones/')).toBeVisible();
    await expect(phase.locator('text=/Impacto esperado/')).toBeVisible();
    await expect(phase.locator('text=/Responsable sugerido/')).toBeVisible();
  });
});

test.describe('Historical Comparison', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  async function openReport(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });
  }

  test('comparison tab is visible', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('report-tab-comparison').click();
    await expect(page.getByTestId('historical-comparison')).toBeVisible();
  });
});

test.describe('Export', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  async function openReport(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });
  }

  test('export button opens modal', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-export').click();
    await expect(page.getByTestId('export-modal')).toBeVisible();
  });

  test('export modal has 3 format options', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-export').click();
    await expect(page.getByTestId('export-format-pdf')).toBeVisible();
    await expect(page.getByTestId('export-format-word')).toBeVisible();
    await expect(page.getByTestId('export-format-markdown')).toBeVisible();
  });

  test('export modal has section checkboxes', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-export').click();
    const modal = page.getByTestId('export-modal');
    await expect(modal.locator('text=/Resumen Ejecutivo/')).toBeVisible();
    await expect(modal.locator('text=/Health Score/')).toBeVisible();
    await expect(modal.locator('text=/Evidencias/')).toBeVisible();
    await expect(modal.locator('text=/Roadmap/')).toBeVisible();
  });
});

test.describe('Share', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  async function openReport(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('analysis-start').click();
    await page.getByTestId('executive-report').waitFor({ timeout: 30_000 });
  }

  test('share button opens modal', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-share').click();
    await expect(page.getByTestId('share-modal')).toBeVisible();
  });

  test('share modal has 3 methods', async ({ page }) => {
    await openReport(page);
    await page.getByTestId('open-share').click();
    await expect(page.getByTestId('share-method-link')).toBeVisible();
    await expect(page.getByTestId('share-method-email')).toBeVisible();
    await expect(page.getByTestId('share-method-download')).toBeVisible();
  });
});

test.describe('Action Plan', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  async function openAnalysis(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('analysis-start').click();
    await page.getByTestId('analysis-results').waitFor({ timeout: 30_000 });
  }

  test('opportunity card has more actions button', async ({ page }) => {
    await openAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await expect(card.getByTestId('more-actions')).toBeVisible();
  });

  test('more actions reveals extended menu', async ({ page }) => {
    await openAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await card.getByTestId('more-actions').click();
    await expect(card.getByTestId('action-menu')).toBeVisible();
    await expect(card.getByTestId('action-postpone')).toBeVisible();
    await expect(card.getByTestId('action-assign')).toBeVisible();
    await expect(card.getByTestId('action-schedule')).toBeVisible();
    await expect(card.getByTestId('action-create_task')).toBeVisible();
  });
});
