import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ConnectorRuntime,
  createExecutionContext,
  TEST_CONNECTOR_ID,
  TEST_OPERATIONS,
  resetUnstableState,
} from '../src/index';

function setupRuntime(): ConnectorRuntime {
  const runtime = new ConnectorRuntime({
    backoff: undefined as never,
  } as never);
  for (const op of TEST_OPERATIONS) {
    runtime.registerOperation(TEST_CONNECTOR_ID, op);
  }
  return runtime;
}

function ctx() {
  return createExecutionContext({ organizationId: 'org-1', userId: 'user-1' });
}

describe('ConnectorRuntime — Echo Operation', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should echo a message successfully', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'echo',
      input: { message: 'hello' },
      context: ctx(),
    });

    assert.equal(result.success, true);
    assert.equal(result.error, null);
    assert.equal(result.operation, 'echo');
    assert.equal(result.connectorId, TEST_CONNECTOR_ID);
    const data = result.data as { echoed: string };
    assert.equal(data.echoed, 'hello');
  });

  it('should validate input and fail for missing message', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'echo',
      input: {},
      context: ctx(),
    });

    assert.equal(result.success, false);
    assert.equal(result.error!.errorCode, 'VALIDATION_ERROR');
  });
});

describe('ConnectorRuntime — Fail Operation', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should fail with provider error and retry', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'fail',
      input: { errorCode: 'PROVIDER_ERROR', message: 'forced failure' },
      context: ctx(),
    });

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.equal(result.error!.errorCode, 'PROVIDER_ERROR');
    assert.ok(result.attempts >= 1, `attempts should be >= 1, got ${result.attempts}`);
  });

  it('should not retry non-retryable errors', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'fail',
      input: { errorCode: 'AUTHENTICATION_ERROR', message: 'auth fail' },
      context: ctx(),
    });

    assert.equal(result.success, false);
    assert.equal(result.error!.errorCode, 'AUTHENTICATION_ERROR');
    assert.equal(result.attempts, 1);
  });
});

describe('ConnectorRuntime — RequiresAuth Operation', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should fail with authentication error (non-retryable)', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'requiresAuth',
      input: {},
      context: ctx(),
    });

    assert.equal(result.success, false);
    assert.equal(result.error!.errorCode, 'AUTHENTICATION_ERROR');
    assert.equal(result.attempts, 1);
  });
});

describe('ConnectorRuntime — RefreshToken Operation', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should refresh token successfully', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'refreshToken',
      input: { currentRefreshToken: 'refresh-123' },
      context: ctx(),
    });

    assert.equal(result.success, true);
    const data = result.data as { refreshed: boolean; newTokenExpiresAt: string };
    assert.equal(data.refreshed, true);
    assert.ok(data.newTokenExpiresAt);
  });
});

describe('ConnectorRuntime — Unstable Operation', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should succeed after retries when failFirstN is within retry budget', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'unstableOperation',
      input: { failFirstN: 2 },
      context: ctx(),
    });

    assert.equal(result.success, true);
    const data = result.data as { attempt: number; succeeded: boolean };
    assert.equal(data.succeeded, true);
    assert.ok(result.attempts >= 3, `expected >= 3 attempts, got ${result.attempts}`);
  });

  it('should fail when failFirstN exceeds retry budget', async () => {
    const result = await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'unstableOperation',
      input: { failFirstN: 10 },
      context: ctx(),
    });

    assert.equal(result.success, false);
    assert.equal(result.error!.errorCode, 'PROVIDER_ERROR');
  });
});

describe('ConnectorRuntime — Telemetry & Metrics', () => {
  let runtime: ConnectorRuntime;

  beforeEach(() => {
    runtime = setupRuntime();
    resetUnstableState();
  });

  it('should emit telemetry events for successful execution', async () => {
    await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'echo',
      input: { message: 'hello' },
      context: ctx(),
    });

    const telemetry = runtime.getTelemetry();
    const startedEvents = telemetry.getEventsByType('connector.execution.started');
    const completedEvents = telemetry.getEventsByType('connector.execution.completed');

    assert.ok(startedEvents.length >= 1);
    assert.ok(completedEvents.length >= 1);
  });

  it('should record metrics for successful execution', async () => {
    await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'echo',
      input: { message: 'hello' },
      context: ctx(),
    });

    const snapshot = runtime.getMetrics().getSnapshot({
      connectorId: TEST_CONNECTOR_ID,
      organizationId: 'org-1',
      operation: 'echo',
    });

    assert.ok(snapshot);
    assert.equal(snapshot!.totalExecutions, 1);
    assert.equal(snapshot!.successfulExecutions, 1);
  });

  it('should create trace spans', async () => {
    await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'echo',
      input: { message: 'hello' },
      context: ctx(),
    });

    const spans = runtime.getTrace().getSpansByExecution(
      // Get the last started event's executionId
      runtime.getTelemetry().getEventsByType('connector.execution.started').slice(-1)[0]!.executionId,
    );
    assert.ok(spans.length >= 1);
    assert.equal(spans[0]!.status, 'completed');
  });

  it('should create audit events', async () => {
    await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'echo',
      input: { message: 'hello' },
      context: ctx(),
    });

    const auditEvents = runtime.getAuditLog().getEvents();
    const execEvents = auditEvents.filter((e) => e.eventType === 'execution.completed');
    assert.ok(execEvents.length >= 1);
    assert.equal(execEvents[0]!.outcome, 'success');
  });
});

describe('ConnectorRuntime — Operation Registry', () => {
  it('should list registered operations', () => {
    const runtime = setupRuntime();
    const ops = runtime.listOperations(TEST_CONNECTOR_ID);
    assert.equal(ops.length, 7);
    const names = ops.map((o) => o.name).sort();
    assert.deepEqual(names, [
      'echo',
      'fail',
      'rateLimited',
      'refreshToken',
      'requiresAuth',
      'timeout',
      'unstableOperation',
    ]);
  });

  it('should check if operation exists', () => {
    const runtime = setupRuntime();
    assert.equal(runtime.hasOperation(TEST_CONNECTOR_ID, 'echo'), true);
    assert.equal(runtime.hasOperation(TEST_CONNECTOR_ID, 'nonexistent'), false);
  });
});

describe('ConnectorRuntime — Reset', () => {
  it('should reset all state', async () => {
    const runtime = setupRuntime();
    await runtime.execute({
      connectorId: TEST_CONNECTOR_ID,
      operation: 'echo',
      input: { message: 'hello' },
      context: ctx(),
    });

    assert.ok(runtime.getTelemetry().getEvents().length > 0);
    runtime.reset();
    assert.equal(runtime.getTelemetry().getEvents().length, 0);
    assert.equal(runtime.getAuditLog().getEvents().length, 0);
  });
});
