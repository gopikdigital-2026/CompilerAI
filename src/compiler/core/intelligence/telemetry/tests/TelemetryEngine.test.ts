// ─── Telemetry Engine — unit tests ──────────────────────────────────────────────
// Run with: npx vite-node src/compiler/core/intelligence/telemetry/tests/TelemetryEngine.test.ts

import assert from 'node:assert/strict';
import { TelemetryEngine } from '../services/TelemetryEngine';
import { TelemetryEventBus } from '../services/TelemetryEventBus';
import { MetricsCollector } from '../services/MetricsCollector';
import { TraceBuilder } from '../services/TraceBuilder';
import { ExplainabilityBuilder } from '../services/ExplainabilityBuilder';
import { TelemetryNotInitializedError } from '../errors/TelemetryError';
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
void emptyMemory;

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

  test('1. pipeline exitoso — records all stages', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    await orchestrator.execute(mkRequest());
    const traces = telemetry.getTraces();
    assert.equal(traces.length, 1);
    const trace = traces[0];
    assert.ok(trace.stages.length >= 5, `expected >= 5 stages, got ${trace.stages.length}`);
    const events = telemetry.getEvents();
    assert.ok(events.some(e => e.eventType === 'PipelineStarted'));
    assert.ok(events.some(e => e.eventType === 'PipelineCompleted'));
    for (const stage of ['CONTEXT', 'INTENT', 'PLANNING', 'DECISION', 'CONFIDENCE']) {
      assert.ok(events.some(e => e.eventType === 'StageStarted' && (e as unknown as { stage: string }).stage === stage), `missing StageStarted for ${stage}`);
      assert.ok(events.some(e => e.eventType === 'StageCompleted' && (e as unknown as { stage: string }).stage === stage), `missing StageCompleted for ${stage}`);
    }
  });

  test('2. error en una fase — records StageFailed', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('exec-001', 'req-001', 'org-acme');
    engine.recordStageStart('INTENT');
    engine.recordStageFailure('INTENT', ['Classification failed.']);
    const trace = engine.finalizeExecution('FAILED', false);
    assert.equal(trace.pipelineStatus, 'FAILED');
    assert.equal(trace.stages[0].status, 'FAILED');
    assert.deepEqual(trace.stages[0].errors, ['Classification failed.']);
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'StageFailed'));
  });

  test('3. bloqueo del pipeline — records PipelineBlocked', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('exec-002', 'req-002', 'org-acme');
    engine.recordStageStart('CONTEXT');
    engine.recordStageComplete('CONTEXT', { summary: 'Context done.' });
    engine.recordPipelineEvent('PipelineBlocked', { stage: 'CONTEXT', summary: 'Blocked.', blockers: ['No data.'] });
    const trace = engine.finalizeExecution('BLOCKED', false);
    assert.equal(trace.pipelineStatus, 'BLOCKED');
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'PipelineBlocked' && (e as unknown as { blockers: string[] }).blockers.includes('No data.')));  });

  test('4. solicitud de revisión humana — records HumanReviewRequested', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('exec-003', 'req-003', 'org-acme');
    engine.recordStageStart('DECISION');
    engine.recordStageComplete('DECISION', { summary: 'Decision needs approval.' });
    engine.recordPipelineEvent('HumanReviewRequested', { stage: 'DECISION', summary: 'Needs review.', reason: 'High impact' });
    const trace = engine.finalizeExecution('REQUIRES_APPROVAL', true);
    assert.equal(trace.requiresHumanReview, true);
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'HumanReviewRequested'));
  });

  test('5. cálculo correcto de métricas', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    // Execution 1 — completed
    engine.startExecution('e1', 'r1', 'org');
    engine.recordStageStart('CONTEXT');
    engine.recordStageComplete('CONTEXT', { summary: 'ok', confidenceScore: 80, estimatedCost: 10, tokensUsed: 100 });
    engine.finalizeExecution('COMPLETED', false);
    // Execution 2 — blocked
    engine.startExecution('e2', 'r2', 'org');
    engine.recordStageStart('CONTEXT');
    engine.recordStageComplete('CONTEXT', { summary: 'ok', confidenceScore: 50 });
    engine.recordPipelineEvent('PipelineBlocked', { summary: 'blocked' });
    engine.finalizeExecution('BLOCKED', false);
    const metrics = engine.computeMetrics();
    assert.equal(metrics.totalExecutions, 2);
    assert.equal(metrics.completedExecutions, 1);
    assert.equal(metrics.blockedExecutions, 1);
    assert.ok(metrics.stageMetrics['CONTEXT'] !== undefined);
    assert.equal(metrics.stageMetrics['CONTEXT'].executions, 2);
    assert.equal(metrics.stageMetrics['CONTEXT'].averageConfidence, 65);
  });

  test('6. construcción del ExplainabilityRecord', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    await orchestrator.execute(mkRequest());
    const traces = telemetry.getTraces();
    const explain = telemetry.explain(traces[0]);
    assert.ok(explain.explainabilityId.length > 0);
    assert.ok(explain.summary.length > 0);
    assert.ok(explain.outcomeReason.length > 0);
    assert.ok(explain.createdAt.length > 0);
    assert.ok(explain.organizationId === 'org-acme');
  });

  test('7. reanudación de ejecución — two traces recorded', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    const fullRun = await orchestrator.execute(mkRequest());
    assert.ok(fullRun.contextResult && fullRun.intentResult);
    await orchestrator.execute(mkRequest({
      resumeFrom: 'PLANNING',
      existingResults: { contextResult: fullRun.contextResult!, intentResult: fullRun.intentResult! },
    }));
    assert.equal(telemetry.getTraces().length, 2);
  });

  test('8. orden correcto de eventos', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    await orchestrator.execute(mkRequest());
    const events = telemetry.getEvents();
    const types = events.map(e => e.eventType);
    assert.equal(types[0], 'PipelineStarted', 'first event must be PipelineStarted');
    assert.equal(types[types.length - 1], 'PipelineCompleted', 'last event must be PipelineCompleted');
    // Verify stage ordering: StageStarted before StageCompleted for each stage
    const ctxStartedIdx = types.indexOf('StageStarted');
    const ctxCompletedIdx = types.indexOf('StageCompleted');
    assert.ok(ctxStartedIdx < ctxCompletedIdx, 'StageStarted must come before StageCompleted');
  });

  test('9. determinismo de las trazas', async () => {
    const req = mkRequest();
    const t1 = new TelemetryEngine(makeTelemetryDeps());
    const t2 = new TelemetryEngine(makeTelemetryDeps());
    const o1 = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry: t1 });
    const o2 = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry: t2 });
    await o1.execute(req);
    await o2.execute(req);
    const e1 = t1.getEvents();
    const e2 = t2.getEvents();
    assert.equal(e1.length, e2.length);
    for (let i = 0; i < e1.length; i++) {
      assert.equal(e1[i].eventType, e2[i].eventType);
      assert.equal((e1[i] as unknown as { stage?: string }).stage, (e2[i] as unknown as { stage?: string }).stage);
    }
    const tr1 = t1.getTraces()[0];
    const tr2 = t2.getTraces()[0];
    assert.equal(tr1.stages.length, tr2.stages.length);
    assert.equal(tr1.pipelineStatus, tr2.pipelineStatus);
  });

  test('10. event bus subscribe and emit', () => {
    const bus = new TelemetryEventBus();
    const received: string[] = [];
    bus.subscribe(e => received.push(e.eventType));
    bus.emit({ eventId: '1', eventType: 'StageStarted', executionId: 'e', requestId: 'r', organizationId: 'o', timestamp: '2026', summary: '', metadata: {} });
    assert.equal(received.length, 1);
  });

  test('11. event bus subscribeTo specific type', () => {
    const bus = new TelemetryEventBus();
    const blocked: string[] = [];
    bus.subscribeTo('PipelineBlocked', e => blocked.push(e.eventType));
    bus.emit({ eventId: '1', eventType: 'StageStarted', executionId: 'e', requestId: 'r', organizationId: 'o', timestamp: '2026', summary: '', metadata: {} });
    bus.emit({ eventId: '2', eventType: 'PipelineBlocked', executionId: 'e', requestId: 'r', organizationId: 'o', timestamp: '2026', summary: '', metadata: {} });
    assert.equal(blocked.length, 1);
    assert.equal(blocked[0], 'PipelineBlocked');
  });

  test('12. throws when not initialized', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    assert.throws(() => engine.recordStageStart('CONTEXT'), (err: unknown) => err instanceof TelemetryNotInitializedError);
  });

  test('13. trace persists even on error', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('e1', 'r1', 'org');
    engine.recordStageStart('PLANNING');
    engine.recordStageFailure('PLANNING', ['Plan error.']);
    const trace = engine.finalizeExecution('FAILED', false);
    assert.equal(trace.pipelineStatus, 'FAILED');
    assert.equal(trace.stages.length, 1);
    assert.equal(trace.stages[0].errors.length, 1);
  });

  test('14. orchestrator without telemetry — backward compatible', async () => {
    const orchestrator = new CompilerIntelligenceOrchestrator(makeOrchestratorDeps());
    const r = await orchestrator.execute(mkRequest());
    assert.ok(r.executionId.length > 0);
    assert.ok(r.trace.length >= 5);
  });

  test('15. no sensitive data in events', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    await orchestrator.execute(mkRequest({
      contextRequest: mkContextRequest({
        prompt: 'Analiza con password=secret123 y apikey=abc456',
        metadata: { password: 'secret123', token: 'abc' },
      }),
    }));
    const serialized = JSON.stringify(telemetry.getEvents());
    assert.ok(!serialized.includes('secret123'), 'events must not contain password value');
    assert.ok(!serialized.includes('abc456'), 'events must not contain apikey value');
  });

  test('16. MetricsCollector computes stage metrics', () => {
    const collector = new MetricsCollector(() => 'm-1', () => '2026-01-01T00:00:00.000Z');
    const builder = new TraceBuilder();
    const trace = builder.buildExecutionTrace('t1', 'e1', 'r1', 'org', 'COMPLETED', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:01.000Z', [
      builder.buildStageTrace('s1', 'CONTEXT', 'COMPLETED', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.500Z', 'ok', null, null, [], [], 80, 'LOW', 10, null, 100, null, null),
    ], false, 'CONTEXT');
    collector.collect(trace);
    const metrics = collector.compute();
    assert.equal(metrics.totalExecutions, 1);
    assert.equal(metrics.completedExecutions, 1);
    assert.ok(metrics.stageMetrics['CONTEXT'] !== undefined);
    assert.equal(metrics.stageMetrics['CONTEXT'].averageTokens, 100);
  });

  test('17. TraceBuilder builds stage and execution traces', () => {
    const builder = new TraceBuilder();
    const stage = builder.buildStageTrace('s1', 'CONTEXT', 'COMPLETED', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:01.000Z', 'done');
    assert.equal(stage.durationMs, 1000);
    assert.equal(stage.status, 'COMPLETED');
    const trace = builder.buildExecutionTrace('t1', 'e1', 'r1', 'org', 'COMPLETED', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:05.000Z', [stage], false, 'CONTEXT');
    assert.equal(trace.totalDurationMs, 5000);
    assert.equal(trace.stages.length, 1);
    assert.equal(trace.version, '1.0.0');
  });

  test('18. ExplainabilityBuilder builds from trace and results', () => {
    const builder = new ExplainabilityBuilder({ idGenerator: () => 'exp-1', clock: () => '2026-01-01T00:00:00.000Z' });
    const tb = new TraceBuilder();
    const trace = tb.buildExecutionTrace('t1', 'e1', 'r1', 'org', 'COMPLETED', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:01.000Z', [
      tb.buildStageTrace('s1', 'CONTEXT', 'COMPLETED', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.500Z', 'ok'),
    ], false, 'CONTEXT');
    const record = builder.build(trace);
    assert.ok(record.explainabilityId.length > 0);
    assert.ok(record.summary.length > 0);
    assert.ok(record.strengths.length > 0);
  });

  test('19. performance snapshots are collected', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    await orchestrator.execute(mkRequest());
    const snapshots = telemetry.getPerformanceSnapshots();
    assert.ok(snapshots.length > 0, 'should have performance snapshots');
    // Should have per-stage + pipeline-level snapshots
    assert.ok(snapshots.some(s => s.stage !== null), 'should have stage-level snapshots');
    assert.ok(snapshots.some(s => s.stage === null), 'should have pipeline-level snapshot');
  });

  test('20. event bus handler errors do not break emission', () => {
    const bus = new TelemetryEventBus();
    let count = 0;
    bus.subscribe(() => { throw new Error('handler crash'); });
    bus.subscribe(() => { count++; });
    bus.emit({ eventId: '1', eventType: 'StageStarted', executionId: 'e', requestId: 'r', organizationId: 'o', timestamp: '2026', summary: '', metadata: {} });
    assert.equal(count, 1, 'second handler should still receive the event');
  });

  test('21. ConfidenceCalculated event emitted', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    await orchestrator.execute(mkRequest());
    const events = telemetry.getEvents();
    assert.ok(events.some(e => e.eventType === 'ConfidenceCalculated'), 'should emit ConfidenceCalculated');
  });

  test('22. DecisionRejected event emitted on invalid decision', () => {
    const engine = new TelemetryEngine(makeTelemetryDeps());
    engine.startExecution('e1', 'r1', 'org');
    engine.recordStageStart('DECISION');
    engine.recordStageComplete('DECISION', { summary: 'Decision made.' });
    engine.recordPipelineEvent('DecisionRejected', { stage: 'DECISION', summary: 'Invalid.', reason: 'Low confidence', rejectedDecisionIds: ['d1'] });
    engine.finalizeExecution('BLOCKED', false);
    const events = engine.getEvents();
    assert.ok(events.some(e => e.eventType === 'DecisionRejected'), 'should emit DecisionRejected');
  });

  test('23. trace contains duration, warnings, errors, confidence, risk per stage', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    await orchestrator.execute(mkRequest());
    const trace = telemetry.getTraces()[0];
    for (const stage of trace.stages) {
      assert.ok(stage.durationMs !== null, `${stage.stage} should have durationMs`);
      assert.ok(Array.isArray(stage.warnings), `${stage.stage} should have warnings array`);
      assert.ok(Array.isArray(stage.errors), `${stage.stage} should have errors array`);
    }
  });

  test('24. orchestrator blocked scenario — telemetry captures it', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    const r = await orchestrator.execute(mkRequest({
      contextRequest: mkContextRequest({ prompt: 'Reduce inmediatamente el 20 % de la plantilla.' }),
    }));
    assert.ok(r.status !== 'COMPLETED', 'should not complete for workforce reduction');
    const events = telemetry.getEvents();
    assert.ok(
      events.some(e => e.eventType === 'PipelineBlocked' || e.eventType === 'HumanReviewRequested'),
      'should emit blocked or human review event',
    );
  });

  test('25. explainability with pipeline results — decisions and alternatives', async () => {
    const telemetry = new TelemetryEngine(makeTelemetryDeps());
    const orchestrator = new CompilerIntelligenceOrchestrator({ ...makeOrchestratorDeps(), telemetry });
    const r = await orchestrator.execute(mkRequest());
    const trace = telemetry.getTraces()[0];
    const explain = telemetry.explain(trace, {
      decisionResult: r.decisionResult,
      confidenceResult: r.confidenceResult,
      executionPlan: r.executionPlan,
    });
    assert.ok(explain.acceptedDecisions !== undefined);
    assert.ok(explain.rejectedDecisions !== undefined);
    assert.ok(explain.alternativesEvaluated !== undefined);
    assert.ok(explain.risks !== undefined);
    assert.ok(explain.uncertainties !== undefined);
    if (r.confidenceResult) {
      assert.equal(explain.confidenceScore, r.confidenceResult.overallScore);
    }
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

run();
