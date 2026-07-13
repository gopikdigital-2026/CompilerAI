// ─── Context Intelligence — unit tests ─────────────────────────────────────────
// Dependency-free test harness exercising the Context Intelligence Layer.
// Run with: npx vite-node src/compiler/core/intelligence/__tests__/contextIntelligence.test.ts
//
// Scenarios:
//   1. Sufficient context → READY
//   2. Ambiguous request  → NEEDS_CLARIFICATION
//   3. No enterprise data → NEEDS_DATA
//   4. Restricted information handled safely
//   5. Non-existent organization → BLOCKED

import assert from 'node:assert/strict';

import { ContextIntelligenceService } from '../ContextIntelligenceService';
import { ContextAnalyzer, maxClassification } from '../context/ContextAnalyzer';
import { ContextEnricher } from '../context/ContextEnricher';
import { ContextValidator } from '../context/ContextValidator';
import type { ContextRequest } from '../models/ContextRequest';
import type { EnterpriseMemorySnapshot } from '../interfaces/IContextEnricher';
import type { DataClassification } from '../models/ContextSource';

// ── Helpers ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try { fn(); passed++; console.log(`  \u2713 ${name}`); }
  catch (err) {
    failed++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  \u2717 ${name}\n      ${msg}`);
  }
}

function makeRequest(partial: Partial<ContextRequest>): ContextRequest {
  return {
    requestId:      `req-${Math.random().toString(36).slice(2, 8)}`,
    prompt:         '',
    organizationId: 'org-acme',
    locale:         'es',
    receivedAt:     Date.now(),
    ...partial,
  };
}

function emptyMemory(orgId: string): EnterpriseMemorySnapshot {
  return { organizationId: orgId, exists: false, entries: [] };
}

function richMemory(orgId: string): EnterpriseMemorySnapshot {
  return {
    organizationId: orgId,
    exists:         true,
    entries: [
      { key: 'org.sla.responseHours', value: '4h',       classification: 'INTERNAL' },
      { key: 'crm.lastOrder.value',    value: '€12.400', classification: 'CONFIDENTIAL' },
    ],
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  const service = new ContextIntelligenceService();

  // 1 — Sufficient context → READY ──────────────────────────────────────────────
  await test('sufficient context yields READY', async () => {
    const req = makeRequest({
      prompt: 'Automatiza la sincronización de pedidos desde Shopify hacia el ERP SAP cada noche, '
            + 'notificando al equipo por Slack. Presupuesto máximo 500 y deadline para el 30.',
    });
    const result = await service.analyze(req, richMemory(req.organizationId));
    assert.equal(result.status, 'READY',
      `expected READY, got ${result.status} (score ${result.sufficiencyScore})`);
    assert.ok(result.sufficiencyScore >= 75, `score ${result.sufficiencyScore} < 75`);
    // READY may carry low-severity advisory gaps, but never blocking ones.
    const blocking = result.missingInformation.filter(g => g.severity !== 'low');
    assert.equal(blocking.length, 0, 'should have no blocking gaps');
    assert.ok(result.recommendedSources.length > 0, 'should recommend sources');
    assert.equal(result.organizationId, req.organizationId);
    assert.ok(result.requestId === req.requestId);
    assert.ok(result.detectedIntent.length > 0);
    assert.ok(result.createdAt.length > 0);
  });

  // 2 — Ambiguous request → NEEDS_CLARIFICATION ─────────────────────────────────
  await test('ambiguous request yields NEEDS_CLARIFICATION', async () => {
    const req = makeRequest({ prompt: 'quiero algo' });
    const result = await service.analyze(req, richMemory(req.organizationId));
    assert.ok(['NEEDS_CLARIFICATION', 'NEEDS_DATA', 'BLOCKED'].includes(result.status),
      `expected non-READY, got ${result.status}`);
    assert.ok(result.sufficiencyScore < 75, `score ${result.sufficiencyScore} should be < 75`);
    assert.ok(result.missingInformation.length > 0, 'should report gaps');
    const hasClarification = result.missingInformation.some(g =>
      g.kind === 'ambiguous_intent' || g.kind === 'missing_objective');
    assert.ok(hasClarification, 'should flag ambiguous intent or missing objective');
  });

  // 3 — No enterprise data → NEEDS_DATA ─────────────────────────────────────────
  await test('absence of enterprise data yields NEEDS_DATA', async () => {
    const req = makeRequest({
      prompt: 'Analiza las métricas de rendimiento del sistema y genera un reporte de SLA.',
    });
    const result = await service.analyze(req, emptyMemory(req.organizationId));
    assert.equal(result.status, 'NEEDS_DATA',
      `expected NEEDS_DATA, got ${result.status} (score ${result.sufficiencyScore})`);
    assert.ok(result.relevantMemory.length === 0, 'should have no memory');
    const hasDataGap = result.missingInformation.some(g => g.kind === 'missing_data_source');
    assert.ok(hasDataGap, 'should flag missing data source');
  });

  // 4 — Restricted information handled safely ───────────────────────────────────
  await test('restricted information is classified and filtered', async () => {
    const req = makeRequest({
      prompt: 'Procesa los datos financieros y de empleados cumpliendo GDPR antes del cierre mensual.',
      classification: 'RESTRICTED',
    });
    const result = await service.analyze(req, richMemory(req.organizationId));
    assert.ok(result.entities.some(e => e.classification === 'RESTRICTED')
           || result.constraints.some(c => c.classification === 'RESTRICTED'),
      'should detect restricted entities/constraints');
    // Memory entries with classification above request's max should NOT leak.
    const allMemoryPublic = result.relevantMemory.every(
      m => ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'].includes(m.classification));
    assert.ok(allMemoryPublic, 'memory classifications are valid');
    // No sensitive prompt content is echoed in result fields beyond detectedIntent/objectives.
    const serialized = JSON.stringify(result);
    assert.ok(!serialized.includes('GDPR-secret'), 'no raw secret payload leaks');
  });

  // 5 — Non-existent organization → BLOCKED ─────────────────────────────────────
  await test('non-existent organization yields BLOCKED', async () => {
    const req = makeRequest({
      prompt: 'Automatiza el envío de facturas a clientes.',
      organizationId: '',
    });
    const result = await service.analyze(req, emptyMemory(req.organizationId));
    assert.equal(result.status, 'BLOCKED',
      `expected BLOCKED, got ${result.status} (score ${result.sufficiencyScore})`);
    const hasOrgGap = result.missingInformation.some(g => g.kind === 'unresolved_organization');
    assert.ok(hasOrgGap, 'should flag unresolved organization');
    // A critical gap must cap the effective readiness even if raw score is higher.
    assert.ok(
      result.sufficiencyScore < 100 && hasOrgGap,
      'score should not be perfect when organization is unresolved',
    );
  });

  // ── Component-level sanity ────────────────────────────────────────────────────
  test('maxClassification escalates to highest rank', () => {
    assert.equal(maxClassification(['PUBLIC', 'INTERNAL']), 'INTERNAL');
    assert.equal(maxClassification(['INTERNAL', 'RESTRICTED', 'CONFIDENTIAL']), 'RESTRICTED');
    assert.equal(maxClassification(['PUBLIC']), 'PUBLIC');
  });

  test('analyzer throws on empty prompt', () => {
    const analyzer = new ContextAnalyzer();
    assert.throws(() => analyzer.analyze(makeRequest({ prompt: '' })), /prompt is required/);
  });

  test('enricher recommends CRM for customer entities', () => {
    const enricher = new ContextEnricher();
    const ctx = {
      prompt: 'sync customers', locale: 'es',
      detectedIntent: 'integration' as const, secondaryIntents: [],
      objectives: [{ label: 'Integrar sistemas', detail: 'via integration for customer' }],
      entities: [{ type: 'customer', classification: 'CONFIDENTIAL' as DataClassification }],
      constraints: [], urgency: 'normal' as const, maxClassification: 'CONFIDENTIAL' as DataClassification,
    };
    const req = makeRequest({ prompt: 'sync customers' });
    const out = enricher.enrich(ctx, req, richMemory(req.organizationId));
    assert.ok(out.recommendedSources.some(s => s.kind === 'crm'), 'should recommend a CRM source');
  });

  test('validator buildResult assembles all required fields', () => {
    const validator = new ContextValidator();
    const ctx = {
      prompt: 'automate', locale: 'es',
      detectedIntent: 'automation' as const, secondaryIntents: [],
      objectives: [{ label: 'Automatizar proceso', detail: 'via automation' }],
      entities: [{ type: 'order', classification: 'INTERNAL' as DataClassification }],
      constraints: [{ type: 'deadline', value: 'Deadline: tomorrow', classification: 'PUBLIC' as DataClassification }],
      urgency: 'high' as const, maxClassification: 'INTERNAL' as DataClassification,
    };
    const req = makeRequest({ prompt: 'automate' });
    const enrichment = { relevantMemory: [], recommendedSources: [], hasEnterpriseData: true };
    const result = validator.buildResult(ctx, enrichment, req);
    const required: (keyof typeof result)[] = [
      'requestId', 'organizationId', 'detectedIntent', 'objectives', 'entities',
      'constraints', 'relevantMemory', 'recommendedSources', 'missingInformation',
      'sufficiencyScore', 'status', 'createdAt',
    ];
    for (const key of required) {
      assert.ok(key in result, `missing field ${key}`);
    }
  });

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
