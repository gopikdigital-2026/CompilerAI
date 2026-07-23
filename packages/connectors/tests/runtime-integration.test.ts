import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConnectorRuntime,
  createExecutionContext,
  RetryPolicy,
  ExponentialBackoff,
  CircuitBreaker,
  RateLimiter,
  TimeoutPolicy,
  TEST_CONNECTOR_ID,
  TEST_OPERATIONS,
  resetUnstableState,
} from '../src/index';

function setupRuntime(config?: {
  failureThreshold?: number;
  capacity?: number;
  maxAttempts?: number;
}): ConnectorRuntime {
  const retryPolicy = new RetryPolicy({
    maxAttempts: config?.maxAttempts ?? 3,
    initialDelayMs: 10,
    maxDelayMs: 50,
    jitter: false,
  });
  const backoff = new ExponentialBackoff({
    initialDelayMs: 10,
    maxDelayMs: 50,
    multiplier: 2,
    jitter: false,
  });
  const circuitBreaker = new CircuitBreaker({
    failureThreshold: config?.failureThreshold ?? 3,
    successThreshold: 1,
    openDurationMs: 50,
  });
  const rateLimiter = new RateLimiter({
    capacity: config?.capacity ?? 100,
    refillRatePerSecond: 100,
  });
  const timeoutPolicy = new TimeoutPolicy();

  const runtime = new ConnectorRuntime({
    retryPolicy,
    backoff,
    circuitBreaker,
    rateLimiter,
    timeoutPolicy,
  });

  for (const op of TEST_OPERATIONS) {
    runtime.registerOperation(TEST_CONNECTOR_ID, op);
  }
  return runtime;
}

function ctx() {
  return createExecutionContext({ organizationId: 'org-1', userId: 'user-1' });
}

describe('Runtime Integration — Full Pipeline Success', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should complete echo through full pipeline with telemetry, metrics, trace, and audit', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'echo',
      input: { message: 'integration-test' },
      context: ctx(),
    });

    assert.equal(result.success, true);
    assert.equal(result.attempts, 1);
    assert.ok(result.durationMs >= 0);

    const telemetry = runtime.getTelemetry();
    assert.ok(telemetry.getEventsByType('connector.execution.started').length >= 1);
    assert.ok(telemetry.getEventsByType('connector.execution.completed').length >= 1);

    const metrics = runtime.getMetrics();
    const snapshot = metrics.getSnapshot({
      connectorId: TEST_CONNECTOR_ID, organizationId: 'org-1', operation: 'echo',
    });
    assert.ok(snapshot);
    assert.equal(snapshot!.successfulExecutions, 1);

    const auditEvents = runtime.getAuditLog().getEvents();
    assert.ok(auditEvents.some((e) => e.eventType === 'execution.completed' && e.outcome === 'success'));
  });
});

describe('Runtime Integration — Retry + Circuit Breaker', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime({ failureThreshold: 2, maxAttempts: 3 });
    resetUnstableState();
  });

  it('should retry unstable operation and succeed', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'unstableOperation',
      input: { failFirstN: 1 },
      context: ctx(),
    });

    assert.equal(result.success, true);
    assert.ok(result.attempts >= 2, `expected >= 2 attempts, got ${result.attempts}`);

    const retriedEvents = runtime.getTelemetry().getEventsByType('connector.execution.retried');
    assert.ok(retriedEvents.length >= 1);
  });

  it('should open circuit after repeated failures', async () => {
    // failOperation always fails with PROVIDER_ERROR (retryable, but not idempotent)
    // So it will fail all retry attempts
    for (let i = 0; i < 3; i++) {
      await runtime.execute({
        connectorId: TEST_CONNECTOR_ID,
        operation: 'fail',
        input: { errorCode: 'PROVIDER_ERROR' },
        context: ctx(),
      });
    }

    // Circuit should be open now (failureThreshold=2, each execution has 3 attempts)
    const state = runtime.getCircuitBreaker().getState(TEST_CONNECTOR_ID, 'org-1', 'fail');
    assert.equal(state, 'OPEN');

    // Next call should be rejected with CIRCUIT_OPEN_ERROR
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'fail',
      input: { errorCode: 'PROVIDER_ERROR' },
      context: ctx(),
    });
    assert.equal(result.success, false);
    assert.equal(result.error!.errorCode, 'CIRCUIT_OPEN_ERROR');
  });
});

describe('Runtime Integration — Rate Limiting', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime({ capacity: 2 });
    resetUnstableState();
  });

  it('should rate limit after capacity exceeded', async () => {
    // First 2 requests should succeed
    const r1 = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID, operation: 'echo',
      input: { message: 'a' }, context: ctx(),
    });
    const r2 = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID, operation: 'echo',
      input: { message: 'b' }, context: ctx(),
    });
    assert.equal(r1.success, true);
    assert.equal(r2.success, true);

    // Third should be rate limited
    const r3 = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID, operation: 'echo',
      input: { message: 'c' }, context: ctx(),
    });
    assert.equal(r3.success, false);
    assert.equal(r3.error!.errorCode, 'RATE_LIMIT_ERROR');
  });
});

describe('Runtime Integration — Timeout', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should timeout long-running operations', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'timeout',
      input: { delayMs: 5000 },
      context: ctx(),
    });

    assert.equal(result.success, false);
    assert.equal(result.error!.errorCode, 'TIMEOUT_ERROR');
    assert.equal(result.attempts, 1);
  });
});

describe('Runtime Integration — Auth Error (Non-Retryable)', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should not retry authentication errors', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'requiresAuth',
      input: {},
      context: ctx(),
    });

    assert.equal(result.success, false);
    assert.equal(result.error!.errorCode, 'AUTHENTICATION_ERROR');
    assert.equal(result.attempts, 1);

    const retriedEvents = runtime.getTelemetry().getEventsByType('connector.execution.retried');
    assert.equal(retriedEvents.length, 0);
  });
});

describe('Runtime Integration — Cancellation', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should cancel operation via abort signal', async () => {
    const controller = new AbortController();
    const echoOp = TEST_OPERATIONS.find((o) => o.name === 'echo')!;

    // Re-register echo with a delay
    runtime.registerOperation(TEST_CONNECTOR_ID, {
      ...echoOp,
      async execute(input, context, signal) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(resolve, 5000);
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new DOMException('Aborted', 'AbortError'));
          }, { once: true });
        });
        return echoOp.execute(input, context, signal);
      },
    });

    setTimeout(() => controller.abort(), 50);

    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'echo',
      input: { message: 'hello' },
      context: ctx(),
      abortSignal: controller.signal,
    });

    assert.equal(result.success, false);
    assert.equal(result.error!.errorCode, 'CANCELLED_ERROR');
  });
});

describe('Runtime Integration — Audit Trail', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should record audit events for success and failure', async () => {
    await runtime.execute({
      connectorId: TEST_CONNECTOR_ID, operation: 'echo',
      input: { message: 'ok' }, context: ctx(),
    });
    await runtime.execute({
      connectorId: TEST_CONNECTOR_ID, operation: 'fail',
      input: { errorCode: 'PROVIDER_ERROR' }, context: ctx(),
    });

    const auditEvents = runtime.getAuditLog().getEvents();
    const successEvents = auditEvents.filter((e) => e.outcome === 'success');
    const failureEvents = auditEvents.filter((e) => e.outcome === 'failure');
    assert.ok(successEvents.length >= 1);
    assert.ok(failureEvents.length >= 1);
  });
});
