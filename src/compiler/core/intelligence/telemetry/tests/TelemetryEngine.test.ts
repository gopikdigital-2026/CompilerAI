// ─── Telemetry Engine — unit tests ──────────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/telemetry/tests/TelemetryEngine.test.ts

import assert from 'node:assert/strict';
import { TelemetryEngine } from '../services/TelemetryEngine';
import { TelemetryEventBus } from '../services/TelemetryEventBus';
import { TelemetryNotInitializedError } from '../errors/TelemetryErrors';
import { CompilerIntelligenceOrchestrator } from '../../orchestrator/services/CompilerIntelligenceOrchestrator';
import { DEFAULT_FACTOR_WEIGHTS } from '../../confidence/rules/ConfidenceRules';
import type { CompilerIntelligenceRequest } from '../../orchestrator/models/CompilerIntelligenceModels';
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
function makeTelemetryDeps() {
  return {
    idGenerator: () => `tel-${(++idCounter).toString().padStart(4, '0')}`,
    clock: () => '2026-01-01T00:00:00.000Z',
  };
}

let execCounter = 0;
function makeOrchestratorDeps() {
  return {
    idGenerator: () => `exec-${(++execCounter).toString().padStart(4, '0')}`,
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

async function run(): Promise<void> {

  // ── TelemetryEngine unit tests ────────────────────────────────────────────────

  test('1. records stage start and complete events', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('exec-001', 'req-001', 'org-acme');
    engine.recordStageStart('CONTEXT');
    engine.recordStageComplete('CONTEXT', { summary: 'Context done.', confidenceScore: 80 });
    engine.finalizeExecution('COMPLETED', false);
    const trace = engine.getTraces()[0];
    assert.equal(trace.stages.length, 1);
    assert.equal(trace.stages[0].stage, 'CONTEXT');
    assert.equal(trace.stages[0].status, 'COMPLETED');
    assert.equal(trace.stages[0].summary, 'Context done.');
  });

  test('2. records stage failure', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('exec-002', 'req-002', 'org-acme');
    engine.recordStageStart('INTENT');
    engine.recordStageFailure('INTENT', ['Classification failed.']);
    engine.finalizeExecution('FAILED', false);
    const trace = engine.getTraces()[0];
    assert.equal(trace.stages[0].status, 'FAILED');
    assert.deepEqual(trace.stages[0].errors, ['Classification failed.']);
    assert.ok(trace.stages[0].durationMs !== null);
  });

  test('3. records pipeline blocked event', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('exec-003', 'req-003', 'org-acme');
    engine.recordStageStart('CONTEXT');
    engine.recordStageComplete('CONTEXT', { summary: 'Context blocked.' });
    engine.recordPipelineEvent('PipelineBlocked', { stage: 'CONTEXT', summary: 'Blocked.', blockers: ['No data.'] });
    const trace = engine.finalizeExecution('BLOCKED', false);
    assert.equal(trace.pipelineStatus, 'BLOCKED');
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'PipelineBlocked'));
  });

  test('4. records human review requested event', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('exec-004', 'req-004', 'org-acme');
    engine.recordStageStart('DECISION');
    engine.recordStageComplete('DECISION', { summary: 'Decision needs approval.' });
    engine.recordPipelineEvent('HumanReviewRequested', { stage: 'DECISION', summary: 'Needs review.' });
    const trace = engine.finalizeExecution('REQUIRES_APPROVAL', true);
    assert.equal(trace.requiresHumanReview, true);
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'HumanReviewRequested'));
  });

  test('5. emits confidence calculated event', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('exec-005', 'req-005', 'org-acme');
    engine.recordStageStart('CONFIDENCE');
    engine.recordStageComplete('CONFIDENCE', { summary: 'Confidence 72.', confidenceScore: 72 });
    engine.recordPipelineEvent('ConfidenceCalculated', { stage: 'CONFIDENCE', summary: 'Score 72.', confidenceScore: 72 });
    engine.finalizeExecution('COMPLETED', false);
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'ConfidenceCalculated' && e.confidenceScore === 72));
  });

  test('6. computes aggregate metrics', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    // Execution 1 — completed
    engine.startExecution('e1', 'r1', 'org');
    engine.recordStageStart('CONTEXT');
    engine.recordStageComplete('CONTEXT', { summary: 'ok', confidenceScore: 80 });
    engine.finalizeExecution('COMPLETED', false);
    // Execution 2 — blocked
    engine.startExecution('e2', 'r2', 'org');
    engine.recordStageStart('CONTEXT');
    engine.recordStageComplete('CONTEXT', { summary: 'ok' });
    engine.recordPipelineEvent('PipelineBlocked', { summary: 'blocked' });
    engine.finalizeExecution('BLOCKED', false);
    const metrics = engine.computeMetrics();
    assert.equal(metrics.totalExecutions, 2);
    assert.equal(metrics.completedExecutions, 1);
    assert.equal(metrics.blockedExecutions, 1);
    assert.ok(metrics.stageMetrics['CONTEXT'] !== undefined);
    assert.equal(metrics.stageMetrics['CONTEXT'].executions, 2);
  });

  test('7. produces explainability record', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('e1', 'r1', 'org');
    engine.recordStageStart('CONTEXT');
    engine.recordStageComplete('CONTEXT', { summary: 'Context analyzed.' });
    engine.finalizeExecution('COMPLETED', false);
    const trace = engine.getTraces()[0];
    const explain = engine.explain(trace);
    assert.ok(explain.explainabilityId.length > 0);
    assert.ok(explain.summary.length > 0);
    assert.equal(explain.stageExplanations.length, 1);
    assert.ok(explain.outcomeReason.length > 0);
  });

  test('8. event bus subscribe and emit', () => {
    const bus = new TelemetryEventBus();
    const received: string[] = [];
    bus.subscribe(e => received.push(e.eventType));
    bus.emit({ eventId: '1', eventType: 'StageStarted', executionId: 'e', requestId: 'r', organizationId: 'o', stage: 'CONTEXT', stageStatus: 'RUNNING', pipelineStatus: null, timestamp: '2026', durationMs: null, confidenceScore: null, riskLevel: null, estimatedCost: null, tokensUsed: null, warnings: [], errors: [], blockers: [], summary: '', requiresHumanReview: false, metadata: {} });
    assert.equal(received.length, 1);
    assert.equal(received[0], 'StageStarted');
  });

  test('9. event bus subscribeTo specific type', () => {
    const bus = new TelemetryEventBus();
    const blocked: string[] = [];
    bus.subscribeTo('PipelineBlocked', e => blocked.push(e.eventType));
    bus.emit({ eventId: '1', eventType: 'StageStarted', executionId: 'e', requestId: 'r', organizationId: 'o', stage: 'CONTEXT', stageStatus: 'RUNNING', pipelineStatus: null, timestamp: '2026', durationMs: null, confidenceScore: null, riskLevel: null, estimatedCost: null, tokensUsed: null, warnings: [], errors: [], blockers: [], summary: '', requiresHumanReview: false, metadata: {} });
    bus.emit({ eventId: '2', eventType: 'PipelineBlocked', executionId: 'e', requestId: 'r', organizationId: 'o', stage: 'CONTEXT', stageStatus: null, pipelineStatus: 'BLOCKED', timestamp: '2026', durationMs: null, confidenceScore: null, riskLevel: null, estimatedCost: null, tokensUsed: null, warnings: [], errors: [], blockers: [], summary: '', requiresHumanReview: false, metadata: {} });
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0], 'PipelineBlocked');
  });

  test('10. throws when not initialized', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    assert.throws(() => engine.recordStageStart('CONTEXT'), (err: unknown) => err instanceof TelemetryNotInitializedError);
  });

  test('11. trace persists even on error', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('e1', 'r1', 'org');
    engine.recordStageStart('PLANNING');
    engine.recordStageFailure('PLANNING', ['Plan error.']);
    const trace = engine.finalizeExecution('FAILED', false);
    assert.equal(trace.pipelineStatus, 'FAILED');
    assert.equal(trace.stages.length, 1);
    assert.equal(trace.stages[0].errors.length, 1);
  });

  // ── Orchestrator integration tests ─────────────────────────────────────────────

  test('12. orchestrator with telemetry — success', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    const r = await orchestrator.execute(mkRequest());
    assert.ok(r.executionId.length > 0);
    const traces = telemetry.getTraces();
    assert.equal(traces.length, 1);
    const events = telemetry.getEvents();
    assert.ok(events.some(e => e.eventType === 'PipelineStarted'));
    assert.ok(events.some(e => e.eventType === 'PipelineCompleted'));
    assert.ok(events.some(e => e.eventType === 'StageStarted' && e.stage === 'CONTEXT'));
    assert.ok(events.some(e => e.eventType === 'StageCompleted'));
  });

  test('13. orchestrator with telemetry — blocked', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    const r = await orchestrator.execute(mkRequest({
      contextRequest: mkContextRequest({ prompt: 'Reduce inmediatamente el 20 % de la plantilla.' }),
    }));
    assert.ok(['BLOCKED', 'REQUIRES_APPROVAL', 'NEEDS_DATA', 'NEEDS_CLARIFICATION'].includes(r.status),
      `expected non-COMPLETED status, got ${r.status}`);
    const events = telemetry.getEvents();
    assert.ok(events.some(e => e.eventType === 'PipelineBlocked' || e.eventType === 'HumanReviewRequested'),
      'should emit blocked or human review event');
  });

  test('14. orchestrator with telemetry — needs data', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    const r = await orchestrator.execute(mkRequest({
      contextRequest: mkContextRequest({ prompt: 'Analiza las métricas de rendimiento del sistema.', organizationId: 'org-empty' }),
      memory: emptyMemory('org-empty'),
    }));
    assert.ok(['NEEDS_DATA', 'NEEDS_CLARIFICATION', 'BLOCKED'].includes(r.status));
    const trace = telemetry.getTraces()[0];
    assert.ok(trace.stages.length > 0);
  });

  test('15. orchestrator with telemetry — human review', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    const r = await orchestrator.execute(mkRequest({
      contextRequest: mkContextRequest({ prompt: 'Reduce inmediatamente el 20 % de la plantilla.' }),
      minimumConfidenceThreshold: 80,
    }));
    assert.ok(r.requiresHumanReview || r.status === 'REQUIRES_APPROVAL' || r.status === 'BLOCKED');
    const events = telemetry.getEvents();
    assert.ok(events.some(e => e.eventType === 'HumanReviewRequested' || e.eventType === 'PipelineBlocked'));
  });

  test('16. orchestrator without telemetry — backward compatible', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeOrchestratorDeps());
    const r = await orchestrator.execute(mkRequest());
    assert.ok(r.executionId.length > 0);
    assert.ok(r.trace.length >= 5);
  });

  test('17. orchestrator with telemetry — resume', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    const fullRun = await orchestrator.execute(mkRequest());
    assert.ok(fullRun.contextResult && fullRun.intentResult);
    const r = await orchestrator.execute(mkRequest({
      resumeFrom: 'PLANNING',
      existingResults: { contextResult: fullRun.contextResult!, intentResult: fullRun.intentResult! },
    }));
    assert.ok(r.executionPlan !== null);
    // Telemetry should have recorded two executions
    assert.equal(telemetry.getTraces().length, 2);
  });

  test('18. no sensitive data in events', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    await orchestrator.execute(mkRequest({
      contextRequest: mkContextRequest({
        prompt: 'Analiza con password=secret123 y apikey=abc456',
        metadata: { password: 'secret123', token: 'abc' },
      }),
    }));
    const events = telemetry.getEvents();
    const serialized = JSON.stringify(events);
    assert.ok(!serialized.includes('secret123'), 'events must not contain password value');
    assert.ok(!serialized.includes('abc456'), 'events must not contain apikey value');
  });

  test('19. deterministic telemetry — same events', async () => {
    const deps1 = { ...makeOrchestratorDeps(), telemetry: new TelemetryEngine(makeTelemetryDeps()) };
    const deps2 = { ...makeOrchestratorDeps(), telemetry: new TelemetryEngine(makeTelemetryDeps()) };
    const o1 = new CompilerIntelligenceOrchestrator(deps1);
    const o2 = new CompilerIntelligenceOrchestrator(deps2);
    const req = mkRequest();
    await o1.execute(req);
    await o2.execute(req);
    const e1 = deps1.telemetry!.getEvents();
    const e2 = deps2.telemetry!.getEvents();
    assert.equal(e1.length, e2.length);
    for (let i = 0; i < e1.length; i++) {
      assert.equal(e1[i].eventType, e2[i].eventType);
      assert.equal(e1[i].stage, e2[i].stage);
    }
  });

  test('20. event bus handler errors do not break emission', () => {
    const bus = new TelemetryEventBus();
    let count = 0;
    bus.subscribe(() => { throw new Error('handler crash'); });
    bus.subscribe(() => { count++; });
    const payload = { eventId: '1', eventType: 'StageStarted' as const, executionId: 'e', requestId: 'r', organizationId: 'o', stage: 'CONTEXT' as const, stageStatus: 'RUNNING' as const, pipelineStatus: null, timestamp: '2026', durationMs: null, confidenceScore: null, riskLevel: null, estimatedCost: null, tokensUsed: null, warnings: [], errors: [], blockers: [], summary: '', requiresHumanReview: false, metadata: {} };
    bus.emit(payload);
    assert.equal(count, 1, 'second handler should still receive the event');
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
