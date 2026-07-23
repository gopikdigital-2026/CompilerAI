import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CircuitBreaker, DEFAULT_CIRCUIT_CONFIG, RuntimeCircuitOpenError as ConnectorCircuitOpenError } from '../src/index';

const CID = 'test-conn' as never;
const OID = 'org-1';

describe('CircuitBreaker — Initial State', () => {
  it('should start in CLOSED state', () => {
    const cb = new CircuitBreaker();
    assert.equal(cb.getState(CID, OID, 'op1'), 'CLOSED');
  });

  it('should allow execution in CLOSED state', () => {
    const cb = new CircuitBreaker();
    assert.equal(cb.canExecute(CID, OID, 'op1'), true);
  });

  it('should have 0 failure count initially', () => {
    const cb = new CircuitBreaker();
    assert.equal(cb.getFailureCount(CID, OID, 'op1'), 0);
  });
});

describe('CircuitBreaker — Opening', () => {
  it('should open after reaching failure threshold', () => {
    const cb = new CircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    assert.equal(cb.getState(CID, OID, 'op1'), 'CLOSED');

    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    assert.equal(cb.getState(CID, OID, 'op1'), 'OPEN');
  });

  it('should not open for non-monitored error codes', () => {
    const cb = new CircuitBreaker();
    for (let i = 0; i < 10; i++) {
      cb.recordFailure(CID, OID, 'op1', 'AUTHENTICATION_ERROR');
    }
    assert.equal(cb.getState(CID, OID, 'op1'), 'CLOSED');
  });

  it('should not allow execution when OPEN', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    assert.equal(cb.canExecute(CID, OID, 'op1'), false);
  });

  it('should report openUntil when open', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, openDurationMs: 5000 });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    const openUntil = cb.getOpenUntil(CID, OID, 'op1');
    assert.ok(openUntil);
  });
});

describe('CircuitBreaker — Half-Open Transition', () => {
  it('should transition to HALF_OPEN after openDurationMs', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, openDurationMs: 50 });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    assert.equal(cb.getState(CID, OID, 'op1'), 'OPEN');

    await new Promise((r) => setTimeout(r, 60));
    assert.equal(cb.getState(CID, OID, 'op1'), 'HALF_OPEN');
  });

  it('should allow execution in HALF_OPEN state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, openDurationMs: 50 });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');

    await new Promise((r) => setTimeout(r, 60));
    assert.equal(cb.canExecute(CID, OID, 'op1'), true);
  });
});

describe('CircuitBreaker — Recovery', () => {
  it('should close after successThreshold successes in HALF_OPEN', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      openDurationMs: 50,
    });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');

    await new Promise((r) => setTimeout(r, 60));
    assert.equal(cb.getState(CID, OID, 'op1'), 'HALF_OPEN');

    cb.recordSuccess(CID, OID, 'op1');
    assert.equal(cb.getState(CID, OID, 'op1'), 'HALF_OPEN');

    cb.recordSuccess(CID, OID, 'op1');
    assert.equal(cb.getState(CID, OID, 'op1'), 'CLOSED');
    assert.equal(cb.getFailureCount(CID, OID, 'op1'), 0);
  });

  it('should reset failure count on success in CLOSED state', () => {
    const cb = new CircuitBreaker({ failureThreshold: 5 });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    assert.equal(cb.getFailureCount(CID, OID, 'op1'), 2);

    cb.recordSuccess(CID, OID, 'op1');
    assert.equal(cb.getFailureCount(CID, OID, 'op1'), 0);
  });

  it('should re-open on failure in HALF_OPEN state', async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      openDurationMs: 50,
    });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');

    await new Promise((r) => setTimeout(r, 60));
    assert.equal(cb.getState(CID, OID, 'op1'), 'HALF_OPEN');

    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    assert.equal(cb.getState(CID, OID, 'op1'), 'OPEN');
  });
});

describe('CircuitBreaker — Isolation', () => {
  it('should isolate state by connector+org+operation', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    assert.equal(cb.getState(CID, OID, 'op1'), 'OPEN');
    assert.equal(cb.getState(CID, OID, 'op2'), 'CLOSED');
    assert.equal(cb.getState('other-conn' as never, OID, 'op1'), 'CLOSED');
    assert.equal(cb.getState(CID, 'org-2', 'op1'), 'CLOSED');
  });
});

describe('CircuitBreaker — Reset', () => {
  it('should reset specific circuit', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    assert.equal(cb.getState(CID, OID, 'op1'), 'OPEN');

    cb.reset(CID, OID, 'op1');
    assert.equal(cb.getState(CID, OID, 'op1'), 'CLOSED');
  });

  it('should reset all circuits', () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    cb.recordFailure(CID, OID, 'op1', 'PROVIDER_ERROR');
    cb.recordFailure(CID, OID, 'op2', 'PROVIDER_ERROR');

    cb.resetAll();
    assert.equal(cb.getState(CID, OID, 'op1'), 'CLOSED');
    assert.equal(cb.getState(CID, OID, 'op2'), 'CLOSED');
  });
});

describe('CircuitBreaker — Error Class', () => {
  it('should create ConnectorCircuitOpenError with correct properties', () => {
    const error = new ConnectorCircuitOpenError('conn', 'op', 'exec-1', {
      failureCount: 5,
      failureThreshold: 5,
      openUntil: '2026-01-01T00:00:00.000Z',
    });
    assert.equal(error.errorCode, 'CIRCUIT_OPEN_ERROR');
    assert.equal(error.retryable, false);
    assert.equal(error.circuit.failureCount, 5);
  });
});

describe('CircuitBreaker — Config', () => {
  it('should export DEFAULT_CIRCUIT_CONFIG', () => {
    assert.equal(DEFAULT_CIRCUIT_CONFIG.failureThreshold, 5);
    assert.equal(DEFAULT_CIRCUIT_CONFIG.successThreshold, 2);
    assert.equal(DEFAULT_CIRCUIT_CONFIG.openDurationMs, 30_000);
    assert.ok(DEFAULT_CIRCUIT_CONFIG.monitoredErrorCodes.includes('PROVIDER_ERROR'));
  });
});
