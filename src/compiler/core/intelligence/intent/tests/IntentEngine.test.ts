// ─── Intent Engine — unit tests ─────────────────────────────────────────────────
// Dependency-free test harness exercising the Intent Engine.
// Run with: npx vite-node src/compiler/core/intelligence/intent/tests/IntentEngine.test.ts
//
// Scenarios:
//   1.  Operational financial analysis
//   2.  Strategic decision
//   3.  Commercial optimization
//   4.  Ambiguous request
//   5.  Multiple intents
//   6.  High-impact request (human approval)
//   7.  Insufficient context
//   8.  Restricted data
//   9.  Non-existent organization
//   10. Unknown intent

import assert from 'node:assert/strict';

import { ContextIntelligenceService } from '../../ContextIntelligenceService';
import { IntentEngine } from '../services/IntentEngine';
import type { ContextRequest } from '../../models/ContextRequest';
import type { EnterpriseMemorySnapshot } from '../../interfaces/IContextEnricher';
import type { IntentResult } from '../models/IntentResult';

// ── Helpers ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void>): void {
  void fn().then(() => { passed++; console.log(`  \u2713 ${name}`); })
    .catch((err) => {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  \u2717 ${name}\n      ${msg}`);
    });
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

function emptyMemory(orgId: string): EnterpriseMemorySnapshot {
  return { organizationId: orgId, exists: false, entries: [] };
}

async function resolve(prompt: string, opts?: {
  orgId?:     string;
  memory?:    EnterpriseMemorySnapshot;
  classification?: ContextRequest['classification'];
}): Promise<IntentResult> {
  const contextService = new ContextIntelligenceService();
  const intentEngine   = new IntentEngine();

  const request = makeRequest({
    prompt,
    organizationId: opts?.orgId ?? 'org-acme',
    classification:  opts?.classification,
  });
  const memory = opts?.memory ?? richMemory(request.organizationId);
  const context = await contextService.analyze(request, memory);
  return intentEngine.resolve(context, undefined, request);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  // 1 — Operational financial analysis ──────────────────────────────────────────
  await test('1. operational financial analysis → ANALYZE / FINANCE', async () => {
    const r = await resolve('Analiza por qué ha bajado nuestro margen este mes.');
    assert.equal(r.primaryIntent, 'ANALYZE');
    assert.equal(r.businessArea, 'FINANCE');
    assert.equal(r.decisionLevel, 'OPERATIONAL');
    assert.ok(r.confidenceScore >= 55, `confidence ${r.confidenceScore} should be >= 55`);
    assert.ok(r.requiredCapabilities.includes('DATA_ANALYSIS'));
    assert.ok(r.suggestedAgentTypes.includes('FINANCIAL_ANALYST_AGENT'));
    assert.ok(r.ambiguityScore < 60, `ambiguity ${r.ambiguityScore} should be < 60`);
  });

  // 2 — Strategic decision ───────────────────────────────────────────────────────
  await test('2. strategic decision → DECIDE / STRATEGY', async () => {
    const r = await resolve('¿Deberíamos abrir una nueva oficina en Portugal el próximo año?');
    assert.equal(r.primaryIntent, 'DECIDE');
    assert.equal(r.businessArea, 'STRATEGY');
    assert.equal(r.decisionLevel, 'STRATEGIC');
    assert.ok(r.requiredCapabilities.includes('DECISION_SUPPORT'));
    assert.ok(r.suggestedAgentTypes.includes('STRATEGY_AGENT'));
  });

  // 3 — Commercial optimization ──────────────────────────────────────────────────
  await test('3. commercial optimization → OPTIMIZE / SALES', async () => {
    const r = await resolve('Identifica qué oportunidades del CRM tienen mayor probabilidad de cerrar.');
    assert.equal(r.primaryIntent, 'OPTIMIZE');
    assert.equal(r.businessArea, 'SALES');
    assert.ok(r.requiredCapabilities.includes('OPTIMIZATION'));
    assert.ok(r.suggestedToolCategories.includes('CRM_TOOLS'));
    assert.ok(r.suggestedAgentTypes.includes('SALES_ANALYST_AGENT'));
  });

  // 4 — Ambiguous request ────────────────────────────────────────────────────────
  await test('4. ambiguous request → NEEDS_CLARIFICATION', async () => {
    const r = await resolve('Mejora la empresa.');
    assert.equal(r.status, 'NEEDS_CLARIFICATION');
    assert.ok(r.requiresClarification, 'should require clarification');
    assert.ok(r.clarificationQuestions.length > 0, 'should have clarification questions');
    assert.ok(r.ambiguityScore > 40, `ambiguity ${r.ambiguityScore} should be > 40`);
  });

  // 5 — Multiple intents ──────────────────────────────────────────────────────────
  await test('5. multiple intents → secondary intents captured', async () => {
    const r = await resolve(
      'Analiza las ventas, predice el próximo trimestre y recomienda qué productos impulsar.',
    );
    assert.equal(r.primaryIntent, 'ANALYZE');
    assert.ok(r.secondaryIntents.includes('PREDICT'), 'should include PREDICT as secondary');
    assert.ok(r.secondaryIntents.includes('RECOMMEND'), 'should include RECOMMEND as secondary');
    assert.ok(r.secondaryIntents.length >= 2, `secondary intents: ${r.secondaryIntents.length}`);
    assert.ok(r.requiredCapabilities.includes('FORECASTING'));
  });

  // 6 — High-impact request → human approval ─────────────────────────────────────
  await test('6. high-impact request → requires human approval', async () => {
    const r = await resolve('Reduce inmediatamente el 20 % de la plantilla.');
    assert.equal(r.businessArea, 'HUMAN_RESOURCES');
    assert.equal(r.impact, 'CRITICAL');
    assert.ok(r.requiresHumanApproval, 'high impact + low confidence should mandate human approval');
    assert.ok(r.requiredCapabilities.includes('HUMAN_APPROVAL'));
    assert.ok(r.suggestedAgentTypes.includes('HR_AGENT'));
  });

  // 7 — Insufficient context ──────────────────────────────────────────────────────
  await test('7. insufficient context → NEEDS_CLARIFICATION or BLOCKED', async () => {
    const r = await resolve('algo', { memory: emptyMemory('org-acme') });
    assert.ok(['NEEDS_CLARIFICATION', 'BLOCKED'].includes(r.status),
      `expected non-READY, got ${r.status}`);
    assert.ok(r.ambiguityScore > 30, `ambiguity ${r.ambiguityScore} should be > 30`);
  });

  // 8 — Restricted data ────────────────────────────────────────────────────────────
  await test('8. restricted data → no automatic external execution', async () => {
    const r = await resolve(
      'Procesa los datos financieros y de empleados cumpliendo GDPR antes del cierre.',
      { classification: 'RESTRICTED' },
    );
    // Restricted data must not auto-grant external execution capability.
    assert.ok(!r.requiredCapabilities.includes('EXTERNAL_DATA_ACCESS'),
      'RESTRICTED data must not auto-grant EXTERNAL_DATA_ACCESS');
    assert.ok(r.classificationReasons.length > 0, 'should be explainable');
    assert.ok(r.requiredCapabilities.includes('HUMAN_APPROVAL')
           || r.requiresHumanApproval
           || r.impact === 'HIGH'
           || r.impact === 'CRITICAL',
      'restricted + high-impact should involve human gate or high impact');
  });

  // 9 — Non-existent organization ────────────────────────────────────────────────
  await test('9. non-existent organization → BLOCKED', async () => {
    const r = await resolve('Analiza las ventas del trimestre.', { orgId: '' });
    assert.equal(r.status, 'BLOCKED');
  });

  // 10 — Unknown intent ───────────────────────────────────────────────────────────
  await test('10. unknown intent → UNKNOWN primary', async () => {
    const r = await resolve('zzzz qqqq xyzzy');
    assert.equal(r.primaryIntent, 'UNKNOWN');
    assert.ok(r.ambiguityScore > 40, `ambiguity ${r.ambiguityScore} should be > 40`);
    assert.ok(r.classificationReasons.length > 0, 'should still be explainable');
  });

  // ── Summary ───────────────────────────────────────────────────────────────────
  // Allow microtasks to flush before reporting.
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
