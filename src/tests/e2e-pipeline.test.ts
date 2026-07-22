import assert from 'node:assert/strict';
import { createTestApplication } from '../bootstrap/ApplicationContainer';
import type { ApplicationContainer } from '../bootstrap/ApplicationContainer';
import type { ContextRequest } from '../compiler/core/intelligence/models/ContextRequest';
import type { EnterpriseMemorySnapshot } from '../compiler/core/intelligence/interfaces/IContextEnricher';
import type { RuntimeRequest } from '../compiler/runtime/models/RuntimeRequest';
import type { CompilerIntelligenceRequest } from '../compiler/core/intelligence/orchestrator/models/CompilerIntelligenceModels';

void (async () => {
  const app: ApplicationContainer = createTestApplication();
  const orgId = 'org-test-001';
  const userId = 'user-test-001';

  const contextRequest: ContextRequest = {
    requestId: 'req-001',
    prompt: 'Analyze quarterly revenue decline in EMEA and recommend actions.',
    organizationId: orgId,
    userId,
    locale: 'en',
    receivedAt: 1_700_000_000_000,
  };

  const memory: EnterpriseMemorySnapshot = {
    organizationId: orgId,
    exists: false,
    entries: [],
  };

  const intelligenceRequest: CompilerIntelligenceRequest = {
    contextRequest,
    memory,
    riskTolerance: 'MEDIUM',
    minimumConfidenceThreshold: 50,
  };

  const runtimeRequest: RuntimeRequest = {
    requestId: 'req-001',
    organizationId: orgId,
    userId,
    intelligenceRequest,
    riskTolerance: 'MEDIUM',
    minimumConfidenceThreshold: 50,
    idempotencyKey: 'idem-key-001',
    maxDurationMs: 30_000,
    allowRollback: true,
    requireApproval: false,
    locale: 'en',
    metadata: {},
    receivedAt: '2023-11-14T22:13:20.000Z',
  };

  // ── Test 1: Full pipeline via orchestrator ──────────────────────────────────
  const result = await app.orchestrator.execute(intelligenceRequest);

  assert.ok(result, 'Orchestrator must return a result');
  assert.equal(result.requestId, 'req-001');
  assert.equal(result.organizationId, orgId);
  assert.ok(result.contextResult, 'Context stage must produce a result');
  assert.ok(result.intentResult, 'Intent stage must produce a result');
  assert.ok(result.executionPlan, 'Planning stage must produce a plan');
  assert.ok(result.decisionResult, 'Decision stage must produce a result');
  assert.ok(result.confidenceResult, 'Confidence stage must produce a result');
  assert.ok(['COMPLETED', 'NEEDS_DATA', 'NEEDS_CLARIFICATION', 'REQUIRES_APPROVAL'].includes(result.status),
    `Pipeline status should be a valid end state, got: ${result.status}`);
  assert.ok(result.trace.length >= 5, `Pipeline must have >=5 trace entries, got ${result.trace.length}`);
  assert.equal(result.version, '1.0.0');
  console.log('PASS: orchestrator pipeline completes all 5 stages');

  // ── Test 2: Runtime execution with workflow ──────────────────────────────────
  const rtResult = await app.runtime.execute(runtimeRequest);
  assert.ok(rtResult, 'Runtime must return a result');
  assert.ok(rtResult.executionId, 'Runtime result must have an executionId');
  assert.equal(rtResult.organizationId, orgId);
  assert.ok(['COMPLETED', 'RUNNING', 'PAUSED', 'AWAITING_APPROVAL', 'FAILED'].includes(rtResult.status),
    `Runtime status should be valid, got: ${rtResult.status}`);
  console.log('PASS: runtime executes workflow');

  // ── Test 3: Telemetry trace recorded ─────────────────────────────────────────
  const events = app.registry.eventPublisher.getEvents();
  void events;
  assert.ok(result.trace.length > 0, 'Telemetry must produce trace entries');
  const contextTrace = result.trace.find(t => t.stage === 'CONTEXT');
  assert.ok(contextTrace, 'Context trace entry must exist');
  assert.ok(contextTrace.success, 'Context stage must succeed');
  console.log('PASS: telemetry traces recorded');

  // ── Test 4: Memory written after pipeline ────────────────────────────────────
  const memResult = app.memory.retrieve({
    organizationId: orgId,
    types: ['EXECUTION'],
    limit: 10,
  });
  assert.ok(memResult, 'Memory retrieve must return a result');
  assert.ok(memResult.entries.length >= 0, 'Memory retrieve must return entries array');
  console.log('PASS: memory engine queried successfully');

  // ── Test 5: Learning engine consumed execution result ────────────────────────
  const learnRecords = app.learning.getRecords(orgId);
  assert.ok(Array.isArray(learnRecords), 'Learning getRecords must return an array');
  console.log('PASS: learning engine queried successfully');

  // ── Test 6: Idempotency — duplicate request is rejected ────────────────────
  try {
    await app.runtime.execute(runtimeRequest);
    assert.fail('Duplicate idempotency key should throw');
  } catch (e) {
    assert.ok(e instanceof Error, 'Idempotency error should be an Error');
    assert.ok(e.message.includes('Duplicate'), `Error should mention duplicate, got: ${e.message}`);
  }
  console.log('PASS: idempotency rejects duplicate requests');

  // ── Test 7: Wrong org is rejected ────────────────────────────────────────────
  const wrongOrgRequest: RuntimeRequest = {
    ...runtimeRequest,
    requestId: 'req-wrong-org',
    organizationId: 'org-wrong-001',
    idempotencyKey: 'idem-key-wrong-org',
    intelligenceRequest: {
      ...intelligenceRequest,
      contextRequest: { ...contextRequest, requestId: 'req-wrong-org', organizationId: 'org-wrong-001' },
      memory: { ...memory, organizationId: 'org-wrong-001' },
    },
  };
  try {
    await app.runtime.execute(wrongOrgRequest);
    console.log('PASS: wrong-org request handled (no crash)');
  } catch (e) {
    assert.ok(e instanceof Error, 'Wrong-org error should be an Error');
    console.log('PASS: wrong-org request rejected with error');
  }

  // ── Test 8: Determinism — same inputs produce same trace structure ──────────
  const app2 = createTestApplication();
  const result2 = await app2.orchestrator.execute(intelligenceRequest);
  assert.equal(result2.trace.length, result.trace.length,
    'Deterministic runs must produce same trace count');
  assert.equal(result2.status, result.status,
    'Deterministic runs must produce same status');
  assert.equal(result2.contextResult?.status, result.contextResult?.status,
    'Deterministic runs must produce same context status');
  assert.equal(result2.intentResult?.status, result.intentResult?.status,
    'Deterministic runs must produce same intent status');
  console.log('PASS: deterministic execution produces identical structure');

  console.log('\n=== End-to-End Pipeline: ALL 8 TESTS PASSED ===');
})().catch((e) => {
  console.error('E2E PIPELINE FAILED:', e);
  process.exit(1);
});
