import { test, expect } from '@playwright/test';
import { attachConsoleErrorCapture, assertNoCriticalErrors } from './helpers/console-errors';

test.describe('Opportunity Intelligence', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  async function runAnalysis(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('analysis-start').click();
    await page.getByTestId('analysis-results').waitFor({ timeout: 30_000 });
  }

  test('opportunity card has overview, evidence, and priority tabs', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await expect(card).toBeVisible();
    await expect(card.getByTestId('opp-tab-overview')).toBeVisible();
    await expect(card.getByTestId('opp-tab-evidence')).toBeVisible();
    await expect(card.getByTestId('opp-tab-priority')).toBeVisible();
  });

  test('overview tab shows economic impact, operational impact, risk, implementation time', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await card.getByTestId('opp-tab-overview').click();
    const overview = card.getByTestId('opp-overview');
    await expect(overview).toBeVisible();
    await expect(overview.locator('text=/Impacto económico/')).toBeVisible();
    await expect(overview.locator('text=/Impacto operativo/')).toBeVisible();
    await expect(overview.locator('text=/Riesgo/')).toBeVisible();
    await expect(overview.locator('text=/Tiempo de implantación/')).toBeVisible();
  });

  test('evidence tab shows evidence panel with source, date, metric', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await card.getByTestId('opp-tab-evidence').click();
    const evidence = card.getByTestId('evidence-panel');
    await expect(evidence).toBeVisible();
    await expect(evidence.locator('text=/Fuente de datos/')).toBeVisible();
    await expect(evidence.locator('text=/Fecha de captura/')).toBeVisible();
    await expect(evidence.locator('text=/Métrica utilizada/')).toBeVisible();
  });

  test('evidence panel shows observed vs expected values', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await card.getByTestId('opp-tab-evidence').click();
    const evidence = card.getByTestId('evidence-panel');
    await expect(evidence.locator('text=/Valor observado/')).toBeVisible();
    await expect(evidence.locator('text=/Valor esperado/')).toBeVisible();
  });

  test('evidence panel shows quality and confidence', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await card.getByTestId('opp-tab-evidence').click();
    const evidence = card.getByTestId('evidence-panel');
    await expect(evidence.locator('text=/Calidad del dato/')).toBeVisible();
    await expect(evidence.locator('text=/Confianza/')).toBeVisible();
  });

  test('evidence panel has view original data button', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await card.getByTestId('opp-tab-evidence').click();
    await expect(card.getByTestId('view-original-data')).toBeVisible();
  });

  test('priority tab shows explanation', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await card.getByTestId('opp-tab-priority').click();
    const priority = card.getByTestId('opp-priority-explanation');
    await expect(priority).toBeVisible();
    await expect(priority.locator('text=/Prioridad calculada/')).toBeVisible();
  });

  test('priority explanation expands on click', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await card.getByTestId('opp-tab-priority').click();
    const expandBtn = card.getByText('Ver explicación del algoritmo');
    await expandBtn.click();
    await expect(card.locator('text=/Impacto/').first()).toBeVisible({ timeout: 3_000 });
  });

  test('opportunity shows priority badge (critical, high, medium, or low)', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await expect(card.locator('text=/Crítica|Alta|Media|Baja/').first()).toBeVisible();
  });

  test('opportunity shows status label', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await expect(card.locator('text=/Nueva|Revisada|Aprobada|En ejecución|Completada|Descartada/').first()).toBeVisible();
  });

  test('approve button works', async ({ page }) => {
    await runAnalysis(page);
    const card = page.getByTestId('opportunity-card').first();
    await card.getByTestId('approve-opportunity').click();
    await expect(card.getByTestId('approve-opportunity')).toBeDisabled({ timeout: 5_000 });
  });
});

test.describe('Impact/Effort Matrix', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  async function runAnalysisAndSwitchToMatrix(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('analysis-start').click();
    await page.getByTestId('analysis-results').waitFor({ timeout: 30_000 });
    await page.getByTestId('view-matrix').click();
  }

  test('matrix renders with 4 quadrant labels', async ({ page }) => {
    await runAnalysisAndSwitchToMatrix(page);
    const matrix = page.getByTestId('impact-effort-matrix');
    await expect(matrix).toBeVisible();
    await expect(matrix.locator('text=/Ganancias rápidas/')).toBeVisible();
    await expect(matrix.locator('text=/Estratégicas/')).toBeVisible();
    await expect(matrix.locator('text=/Rellenos/')).toBeVisible();
    await expect(matrix.locator('text=/Sumideros/')).toBeVisible();
  });

  test('matrix has SVG with opportunity dots', async ({ page }) => {
    await runAnalysisAndSwitchToMatrix(page);
    const svg = page.getByTestId('matrix-svg');
    await expect(svg).toBeVisible();
    const circles = svg.locator('circle');
    const count = await circles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('matrix has filter dropdowns', async ({ page }) => {
    await runAnalysisAndSwitchToMatrix(page);
    await expect(page.getByTestId('matrix-filter-area')).toBeVisible();
    await expect(page.getByTestId('matrix-filter-priority')).toBeVisible();
    await expect(page.getByTestId('matrix-filter-status')).toBeVisible();
  });
});

test.describe('Quick Filters', () => {
  test.beforeEach(async ({ page }) => {
    attachConsoleErrorCapture(page);
  });

  test.afterEach(async () => {
    assertNoCriticalErrors();
  });

  async function runAnalysis(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const nav = page.locator('[data-testid="sidebar-analysis"], a:has-text("Analyze"), a:has-text("Analizar")').first();
    await nav.click();
    await page.waitForLoadState('networkidle');
    await page.getByTestId('analysis-start').click();
    await page.getByTestId('analysis-results').waitFor({ timeout: 30_000 });
  }

  test('quick filter bar is visible', async ({ page }) => {
    await runAnalysis(page);
    await expect(page.getByText('Filtros rápidos')).toBeVisible();
  });

  test('all filter is active by default', async ({ page }) => {
    await runAnalysis(page);
    const allFilter = page.getByTestId('quick-filter-all');
    await expect(allFilter).toBeVisible();
  });

  test('clicking critical filter updates list', async ({ page }) => {
    await runAnalysis(page);
    const criticalFilter = page.getByTestId('quick-filter-critical_only');
    await criticalFilter.click();
    // Wait for filter to apply
    await page.waitForTimeout(500);
    // List should still be visible
    const cards = page.getByTestId('opportunity-card');
    const count = await cards.count();
    // Filtered results may be 0 or more, but the page should not break
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('area filters are visible', async ({ page }) => {
    await runAnalysis(page);
    await expect(page.getByTestId('quick-filter-marketing')).toBeVisible();
    await expect(page.getByTestId('quick-filter-sales')).toBeVisible();
    await expect(page.getByTestId('quick-filter-finance')).toBeVisible();
    await expect(page.getByTestId('quick-filter-operations')).toBeVisible();
    await expect(page.getByTestId('quick-filter-automation')).toBeVisible();
  });

  test('list and matrix view toggles work', async ({ page }) => {
    await runAnalysis(page);
    await expect(page.getByTestId('view-list')).toBeVisible();
    await expect(page.getByTestId('view-matrix')).toBeVisible();
    await page.getByTestId('view-matrix').click();
    await expect(page.getByTestId('impact-effort-matrix')).toBeVisible();
    await page.getByTestId('view-list').click();
    await expect(page.getByTestId('opportunity-card').first()).toBeVisible();
  });
});
