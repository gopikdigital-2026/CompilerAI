import assert from 'node:assert/strict';
import { createTestApplication } from '../../bootstrap/ApplicationContainer';
import type { ApplicationContainer } from '../../bootstrap/ApplicationContainer';
import type { ContextRequest } from '../../compiler/core/intelligence/models/ContextRequest';
import type { EnterpriseMemorySnapshot } from '../../compiler/core/intelligence/interfaces/IContextEnricher';
import type { CompilerIntelligenceRequest } from '../../compiler/core/intelligence/orchestrator/models/CompilerIntelligenceModels';

const ITERATIONS = 10;

void (async () => {
  const app: ApplicationContainer = createTestApplication();
  const orgId = 'org-perf-001';

  const contextRequest: ContextRequest = {
    requestId: 'req-perf-001',
    prompt: 'Analyze quarterly revenue decline in EMEA and recommend actions.',
    organizationId: orgId,
    userId: 'user-perf-001',
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

  const latencies: number[] = [];
  const memoryUsages: NodeJS.MemoryUsage[] = [];
  let totalEvents = 0;
  let totalTraceEntries = 0;

  for (let i = 0; i < ITERATIONS; i++) {
    const req: CompilerIntelligenceRequest = {
      ...intelligenceRequest,
      contextRequest: { ...contextRequest, requestId: `req-perf-${String(i).padStart(3, '0')}` },
    };

    const start = performance.now();
    const result = await app.orchestrator.execute(req);
    const elapsed = performance.now() - start;

    latencies.push(elapsed);
    totalEvents += result.trace.length;
    totalTraceEntries += result.trace.length;
    memoryUsages.push(process.memoryUsage());
  }

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / ITERATIONS;
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  const avgHeapUsed = memoryUsages.reduce((a, b) => a + b.heapUsed, 0) / ITERATIONS;
  const avgEventsPerRun = totalEvents / ITERATIONS;

  console.log('=== Performance Baseline ===');
  console.log(`Iterations:           ${ITERATIONS}`);
  console.log(`Avg latency:          ${avgLatency.toFixed(2)} ms`);
  console.log(`Min latency:          ${minLatency.toFixed(2)} ms`);
  console.log(`Max latency:          ${maxLatency.toFixed(2)} ms`);
  console.log(`Avg heap used:        ${(avgHeapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Avg events per run:   ${avgEventsPerRun.toFixed(1)}`);
  console.log(`Avg trace per run:    ${(totalTraceEntries / ITERATIONS).toFixed(1)}`);
  console.log('==============================');

  assert.ok(avgLatency < 500, `Avg latency should be <500ms, got ${avgLatency}ms`);
  assert.ok(avgEventsPerRun >= 5, `Should produce >=5 events per run, got ${avgEventsPerRun}`);
  console.log('PASS: performance baseline within thresholds');
})().catch((e) => {
  console.error('PERF TEST FAILED:', e);
  process.exit(1);
});
