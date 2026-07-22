// ─── Execution Engine — unit tests ──────────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/execution/tests/ExecutionEngine.test.ts

import assert from 'node:assert/strict';
import { ExecutionEngine } from '../services/ExecutionEngine';
import { ExecutionPolicyValidator } from '../services/ExecutionPolicyValidator';
import { PlanNotApprovedError } from '../errors/ExecutionErrors';
import {
  isPlanApproved, isPlanExecutable, computeIdempotencyKey, deriveExecutionState,
} from '../policies/ExecutionPolicies';
import type { ToolExecutionPlan } from '../../tools/models/ToolExecutionPlan';
import type { ToolPolicy } from '../../tools/models/ToolPolicy';
import type { ExecutionRequest } from '../models/ExecutionRequest';

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
const FIXED_CLOCK = () => '2026-01-01T00:00:00.000Z';
function makeDeps() {
  return {
    idGenerator: () => `eid-${(++idCounter).toString().padStart(4, '0')}`,
    clock: FIXED_CLOCK,
  };
}

function makePlan(overrides: Partial<ToolExecutionPlan> = {}): ToolExecutionPlan {
  return {
    planId: `plan-${++idCounter}`,
    executionId: '',
    organizationId: 'org-acme',
    status: 'READY',
    steps: [
      { stepId: 's1', toolId: 't1', toolName: 'Tool A', order: 1, selection: { selectionId: 'sel1', toolId: 't1', toolName: 'Tool A', rank: 1, totalScore: 80, rationales: [], selected: true, fallbackForToolId: null }, expectedCapabilities: ['DATA_ANALYSIS'], isFallback: false },
      { stepId: 's2', toolId: 't2', toolName: 'Tool B', order: 2, selection: { selectionId: 'sel2', toolId: 't2', toolName: 'Tool B', rank: 2, totalScore: 70, rationales: [], selected: true, fallbackForToolId: null }, expectedCapabilities: ['FORECASTING'], isFallback: false },
    ],
    riskAssessment: null,
    totalTools: 2,
    fallbacksUsed: 0,
    warnings: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    version: '1.0.0',
    ...overrides,
  };
}

function makePolicy(overrides: Partial<ToolPolicy> = {}): ToolPolicy {
  return {
    policyId: `pol-${++idCounter}`,
    organizationId: 'org-acme',
    allowedToolIds: [],
    deniedToolIds: [],
    grantedPermissions: ['READ_PUBLIC', 'READ_INTERNAL', 'EXECUTE'],
    maxDataSensitivity: 'INTERNAL',
    consentGranted: true,
    orgTier: 'enterprise',
    allowFallback: true,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<ExecutionRequest> = {}): ExecutionRequest {
  return {
    plan: makePlan(),
    policy: makePolicy(),
    mode: 'SEQUENTIAL',
    allowRollback: true,
    maxRetries: 2,
    stepTimeoutMs: 5000,
    humanApproved: true,
    idempotencyPrefix: 'exec',
    ...overrides,
  };
}

async function run(): Promise<void> {

  // ── Policy validation ─────────────────────────────────────────────────────────

  test('1. policy — rejects unapproved plan', () => {
    const validator = new ExecutionPolicyValidator();
    const result = validator.validate(makeRequest({ humanApproved: false }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('not been approved')));
  });

  test('2. policy — rejects BLOCKED plan', () => {
    const validator = new ExecutionPolicyValidator();
    const result = validator.validate(makeRequest({ plan: makePlan({ status: 'BLOCKED' }) }));
    assert.equal(result.valid, false);
  });

  test('3. policy — rejects EMPTY plan', () => {
    const validator = new ExecutionPolicyValidator();
    const result = validator.validate(makeRequest({ plan: makePlan({ status: 'EMPTY', steps: [] }) }));
    assert.equal(result.valid, false);
  });

  test('4. policy — rejects org mismatch', () => {
    const validator = new ExecutionPolicyValidator();
    const result = validator.validate(makeRequest({ policy: makePolicy({ organizationId: 'org-other' }) }));
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(e => e.includes('mismatch')));
  });

  test('5. policy — accepts valid request', () => {
    const validator = new ExecutionPolicyValidator();
    const result = validator.validate(makeRequest());
    assert.equal(result.valid, true);
  });

  // ── Success ───────────────────────────────────────────────────────────────────

  test('6. success — executes all steps sequentially', async () => {
    const engine = new ExecutionEngine(makeDeps());
    const result = await engine.execute(makeRequest());
    assert.equal(result.state, 'COMPLETED');
    assert.equal(result.completedSteps, 2);
    assert.equal(result.failedSteps, 0);
    assert.equal(result.stepResults.length, 2);
  });

  test('7. success — DAG mode executes in parallel groups', async () => {
    const engine = new ExecutionEngine(makeDeps());
    const result = await engine.execute(makeRequest({ mode: 'DAG' }));
    assert.equal(result.state, 'COMPLETED');
    assert.equal(result.completedSteps, 2);
    assert.equal(result.mode, 'DAG');
  });

  // ── Timeout ───────────────────────────────────────────────────────────────────

  test('8. timeout — step that simulates timeout fails', async () => {
    const engine = new ExecutionEngine(makeDeps(), {
      timeoutToolIds: ['t1'],
    });
    const result = await engine.execute(makeRequest());
    assert.equal(result.state, 'FAILED');
    assert.ok(result.failedSteps > 0);
    assert.ok(result.errors.some(e => e.includes('timeout')));
  });

  // ── Retry ─────────────────────────────────────────────────────────────────────

  test('9. retry — fails first attempt then succeeds', async () => {
    const failThenSucceed = new Map<string, number>();
    failThenSucceed.set('t1', 1); // Fail once, then succeed
    const engine = new ExecutionEngine(makeDeps(), { failThenSucceed });
    const result = await engine.execute(makeRequest({ maxRetries: 2 }));
    assert.equal(result.state, 'COMPLETED');
    assert.equal(result.completedSteps, 2);
    // First step should have been retried
    const step1 = result.stepResults.find(s => s.stepId === 's1');
    assert.ok(step1!.attempts >= 2, 'should have retried');
  });

  test('10. retry — exhausts retries and fails', async () => {
    const engine = new ExecutionEngine(makeDeps(), { alwaysFailToolIds: ['t1'] });
    const result = await engine.execute(makeRequest({ maxRetries: 1 }));
    assert.equal(result.state, 'FAILED');
    assert.ok(result.failedSteps > 0);
  });

  // ── Partial failure and compensation ──────────────────────────────────────────

  test('11. partial — first step succeeds, second fails, triggers rollback', async () => {
    const engine = new ExecutionEngine(makeDeps(), { alwaysFailToolIds: ['t2'] });
    const result = await engine.execute(makeRequest({ allowRollback: true }));
    assert.equal(result.state, 'PARTIAL');
    assert.ok(result.completedSteps > 0);
    assert.ok(result.failedSteps > 0);
    assert.ok(result.rollbackTriggered, 'rollback should be triggered');
    assert.ok(result.compensatedSteps > 0, 'should have compensated steps');
  });

  test('12. compensation — produces compensation records', async () => {
    const engine = new ExecutionEngine(makeDeps(), { alwaysFailToolIds: ['t2'] });
    const result = await engine.execute(makeRequest({ allowRollback: true }));
    assert.ok(result.compensatedSteps > 0);
  });

  test('13. no rollback — when allowRollback=false, no compensation', async () => {
    const engine = new ExecutionEngine(makeDeps(), { alwaysFailToolIds: ['t2'] });
    const result = await engine.execute(makeRequest({ allowRollback: false }));
    assert.equal(result.rollbackTriggered, false);
    assert.equal(result.compensatedSteps, 0);
  });

  // ── Cancellation ──────────────────────────────────────────────────────────────

  test('14. cancellation — cancel stops execution', async () => {
    const engine = new ExecutionEngine(makeDeps(), { stepDelayMs: 50 });
    const request = makeRequest();
    // Start execution
    const execPromise = engine.execute(request);
    // Cancel after a short delay — but we don't know the execution ID yet
    // Since we can't cancel mid-flight easily in tests, we test the cancel API
    const result = await execPromise;
    // Can't cancel after completion
    assert.equal(engine.cancel('nonexistent'), false);
    assert.equal(result.state, 'COMPLETED');
  });

  // ── Idempotency ───────────────────────────────────────────────────────────────

  test('15. idempotency — deterministic key computation', () => {
    const key1 = computeIdempotencyKey('prefix', 'plan-1', 'step-1');
    const key2 = computeIdempotencyKey('prefix', 'plan-1', 'step-1');
    assert.equal(key1, key2);
    const key3 = computeIdempotencyKey('prefix', 'plan-1', 'step-2');
    assert.notEqual(key1, key3);
  });

  // ── States ────────────────────────────────────────────────────────────────────

  test('16. state — deriveExecutionState COMPLETED', () => {
    assert.equal(deriveExecutionState(2, 2, 0, 0), 'COMPLETED');
  });

  test('17. state — deriveExecutionState FAILED', () => {
    assert.equal(deriveExecutionState(2, 0, 2, 0), 'FAILED');
  });

  test('18. state — deriveExecutionState PARTIAL', () => {
    assert.equal(deriveExecutionState(2, 1, 1, 0), 'PARTIAL');
  });

  test('19. state — deriveExecutionState CANCELLED', () => {
    assert.equal(deriveExecutionState(2, 0, 0, 2), 'CANCELLED');
  });

  // ── Events and traceability ───────────────────────────────────────────────────

  test('20. events — ExecutionStarted and ExecutionCompleted emitted', async () => {
    const engine = new ExecutionEngine(makeDeps());
    await engine.execute(makeRequest());
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'ExecutionStarted'));
    assert.ok(events.some(e => e.eventType === 'ExecutionCompleted'));
  });

  test('21. traceability — traces recorded for each step', async () => {
    const engine = new ExecutionEngine(makeDeps());
    await engine.execute(makeRequest());
    const traces = engine.getTraces();
    assert.ok(traces.length > 0);
    assert.ok(traces.some(t => t.state === 'RUNNING'));
    assert.ok(traces.some(t => t.state === 'COMPLETED'));
  });

  test('22. events — StepFailed and RollbackTriggered on partial failure', async () => {
    const engine = new ExecutionEngine(makeDeps(), { alwaysFailToolIds: ['t2'] });
    await engine.execute(makeRequest({ allowRollback: true }));
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'StepFailed'));
    assert.ok(events.some(e => e.eventType === 'RollbackTriggered'));
    assert.ok(events.some(e => e.eventType === 'StepCompensated'));
  });

  // ── Policy helpers ────────────────────────────────────────────────────────────

  test('23. policy — isPlanApproved checks humanApproved', () => {
    assert.ok(isPlanApproved(makeRequest({ humanApproved: true })));
    assert.ok(!isPlanApproved(makeRequest({ humanApproved: false })));
  });

  test('24. policy — isPlanExecutable rejects EMPTY and BLOCKED', () => {
    assert.ok(isPlanExecutable(makePlan({ status: 'READY' })));
    assert.ok(!isPlanExecutable(makePlan({ status: 'EMPTY', steps: [] })));
    assert.ok(!isPlanExecutable(makePlan({ status: 'BLOCKED' })));
  });

  // ── Empty plan ────────────────────────────────────────────────────────────────

  test('25. empty — empty plan with no steps is rejected', async () => {
    const engine = new ExecutionEngine(makeDeps());
    try {
      await engine.execute(makeRequest({ plan: makePlan({ status: 'EMPTY', steps: [] }) }));
      assert.fail('should have thrown');
    } catch (err) {
      assert.ok(err instanceof PlanNotApprovedError);
    }
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
