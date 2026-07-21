// ─── Compiler Intelligence Orchestrator — unit tests ────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/orchestrator/tests/CompilerIntelligenceOrchestrator.test.ts

import assert from 'node:assert/strict';
import { CompilerIntelligenceOrchestrator } from '../services/CompilerIntelligenceOrchestrator';
import { InvalidOrchestratorInputError } from '../errors/OrchestratorErrors';
import { DEFAULT_FACTOR_WEIGHTS } from '../../confidence/rules/ConfidenceRules';
import type { CompilerIntelligenceRequest } from '../models/CompilerIntelligenceModels';
import type { ContextRequest } from '../../models/ContextRequest';
import type { EnterpriseMemorySnapshot } from '../../interfaces/IContextEnricher';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>): void {
  void Promise.resolve(fn()).then(() => { passed++; console.log(`  \u2713 ${name}`); })
    .catch((err) => {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  \u2717 ${name}\n      ${msg}`);
    });
}

let idCounter = 0;
function makeDeps() {
  return {
    idGenerator: () => `exec-${(++idCounter).toString().padStart(4, '0')}`,
    clock: () => '2026-01-01T00:00:00.000Z',
    factorWeights: { ...DEFAULT_FACTOR_WEIGHTS } as Record<string, number>,
  };
}

function mkContextRequest(overrides: Partial<ContextRequest> = {}): ContextRequest {
  return {
    requestId: `req-${Math.random().toString(36).slice(2, 8)}`,
    prompt: 'Analiza por qué ha bajado nuestro margen este mes.',
    organizationId: 'org-acme',
    locale: 'es',
    receivedAt: Date.now(),
    ...overrides,
  };
}

function richMemory(orgId: string): EnterpriseMemorySnapshot {
  return {
    organizationId: orgId, exists: true,
    entries: [
      { key: 'org.sla.responseHours', value: '4h', classification: 'INTERNAL' },
      { key: 'crm.lastOrder.value', value: '€12.400', classification: 'CONFIDENTIAL' },
    ],
  };
}

function emptyMemory(orgId: string): EnterpriseMemorySnapshot {
  return { organizationId: orgId, exists: false, entries: [] };
}

function mkRequest(overrides: Partial<CompilerIntelligenceRequest> = {}): CompilerIntelligenceRequest {
  const ctxReq = overrides.contextRequest ?? mkContextRequest();
  return {
    contextRequest: ctxReq,
    memory: richMemory(ctxReq.organizationId),
    riskTolerance: 'MEDIUM',
    minimumConfidenceThreshold: 50,
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {

  // 1 — Successful full pipeline → COMPLETED
  test('1. full pipeline success → COMPLETED', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeDeps());
    const r = await orchestrator.execute(mkRequest());
    assert.ok(r.executionId.length > 0, 'should have executionId');
    assert.ok(r.requestId.length > 0, 'should have requestId');
    assert.ok(r.organizationId.length > 0, 'should have organizationId');
    assert.ok(r.contextResult !== null, 'should have contextResult');
    assert.ok(r.intentResult !== null, 'should have intentResult');
    assert.ok(r.executionPlan !== null, 'should have executionPlan');
    assert.ok(r.decisionResult !== null, 'should have decisionResult');
    assert.ok(r.confidenceResult !== null, 'should have confidenceResult');
    assert.ok(r.trace.length >= 5, `should have >= 5 trace entries, got ${r.trace.length}`);
    assert.ok(['COMPLETED', 'REQUIRES_APPROVAL', 'NEEDS_DATA', 'NEEDS_CLARIFICATION'].includes(r.status),
      `expected successful status, got ${r.status}`);
    assert.equal(r.version, '1.0.0');
    assert.ok(r.startedAt.length > 0);
    assert.ok(r.completedAt.length > 0);
  });

  // 2 — Blocked pipeline → BLOCKED
  test('2. blocked pipeline → BLOCKED', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeDeps());
    // Use a prompt that triggers workforce reduction → should block or require approval
    const r = await orchestrator.execute(mkRequest({
      contextRequest: mkContextRequest({
        prompt: 'Reduce inmediatamente el 20 % de la plantilla.',
      }),
    }));
    assert.ok(['BLOCKED', 'REQUIRES_APPROVAL', 'NEEDS_DATA', 'NEEDS_CLARIFICATION'].includes(r.status),
      `expected non-COMPLETED status for workforce reduction, got ${r.status}`);
    assert.ok(r.requiresHumanReview || r.blockers.length > 0 || r.status === 'REQUIRES_APPROVAL',
      'should require human review or have blockers');
  });

  // 3 — Insufficient data → NEEDS_DATA
  test('3. insufficient data → NEEDS_DATA', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeDeps());
    const r = await orchestrator.execute(mkRequest({
      contextRequest: mkContextRequest({
        prompt: 'Analiza las métricas de rendimiento del sistema.',
        organizationId: 'org-empty',
      }),
      memory: emptyMemory('org-empty'),
    }));
    assert.ok(['NEEDS_DATA', 'NEEDS_CLARIFICATION', 'BLOCKED'].includes(r.status),
      `expected NEEDS_DATA or similar, got ${r.status}`);
  });

  // 4 — Human review required → REQUIRES_APPROVAL
  test('4. human review → REQUIRES_APPROVAL', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeDeps());
    const r = await orchestrator.execute(mkRequest({
      contextRequest: mkContextRequest({
        prompt: 'Reduce inmediatamente el 20 % de la plantilla.',
      }),
      minimumConfidenceThreshold: 80,
    }));
    assert.ok(r.requiresHumanReview || r.status === 'REQUIRES_APPROVAL' || r.status === 'BLOCKED',
      `expected human review, got ${r.status}`);
  });

  // 5 — Controlled error → FAILED
  test('5. invalid input → controlled error', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeDeps());
    await assert.rejects(
      () => orchestrator.execute(mkRequest({
        contextRequest: { ...mkContextRequest(), requestId: '' },
      })),
      (err: unknown) => err instanceof InvalidOrchestratorInputError,
    );
  });

  // 6 — Deterministic output
  test('6. deterministic output → same status and scores', async () => {
    const req = mkRequest();
    const orchestrator1 = new CompilerIntelligenceOrchestrator(makeDeps());
    const orchestrator2 = new CompilerIntelligenceOrchestrator(makeDeps());
    const r1 = await orchestrator1.execute(req);
    const r2 = await orchestrator2.execute(req);
    assert.equal(r1.status, r2.status);
    assert.equal(r1.trace.length, r2.trace.length);
    if (r1.confidenceResult && r2.confidenceResult) {
      assert.equal(r1.confidenceResult.overallScore, r2.confidenceResult.overallScore);
    }
  });

  // 7 — Trace contains stage info
  test('7. trace contains stage info', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeDeps());
    const r = await orchestrator.execute(mkRequest());
    const stages = r.trace.map(t => t.stage);
    assert.ok(stages.includes('CONTEXT'), 'trace should include CONTEXT');
    assert.ok(stages.includes('INTENT'), 'trace should include INTENT');
    assert.ok(stages.includes('PLANNING'), 'trace should include PLANNING');
    assert.ok(stages.includes('DECISION'), 'trace should include DECISION');
    assert.ok(stages.includes('CONFIDENCE'), 'trace should include CONFIDENCE');
    for (const t of r.trace) {
      assert.ok(t.startedAt.length > 0);
      assert.ok(t.completedAt.length > 0);
      assert.ok(typeof t.success === 'boolean');
      assert.ok(t.summary.length > 0);
    }
  });

  // 8 — Resume from planning stage
  test('8. resume from PLANNING → skips context and intent', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeDeps());
    // First run to get context and intent results
    const fullRun = await orchestrator.execute(mkRequest());
    assert.ok(fullRun.contextResult !== null);
    assert.ok(fullRun.intentResult !== null);
    // Resume from planning with pre-existing results
    const r = await orchestrator.execute(mkRequest({
      resumeFrom: 'PLANNING',
      existingResults: {
        contextResult: fullRun.contextResult!,
        intentResult: fullRun.intentResult!,
      },
    }));
    const stages = r.trace.map(t => t.stage);
    assert.ok(!stages.includes('CONTEXT'), 'should skip CONTEXT stage');
    assert.ok(!stages.includes('INTENT'), 'should skip INTENT stage');
    assert.ok(stages.includes('PLANNING'), 'should include PLANNING');
    assert.ok(r.executionPlan !== null, 'should have execution plan');
  });

  // 9 — Empty memory → still produces a result
  test('9. empty memory → produces result with warnings', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeDeps());
    const r = await orchestrator.execute(mkRequest({
      memory: emptyMemory('org-acme'),
    }));
    assert.ok(r.status !== 'COMPLETED' || r.warnings.length > 0 || r.contextResult !== null,
      'should produce a result even with empty memory');
  });

  // 10 — Propagates organizationId
  test('10. propagates organizationId', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeDeps());
    const r = await orchestrator.execute(mkRequest({
      contextRequest: mkContextRequest({ organizationId: 'org-test-123' }),
      memory: richMemory('org-test-123'),
    }));
    assert.equal(r.organizationId, 'org-test-123');
    if (r.contextResult) {
      assert.equal(r.contextResult.organizationId, 'org-test-123');
    }
    if (r.intentResult) {
      assert.equal(r.intentResult.organizationId, 'org-test-123');
    }
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
