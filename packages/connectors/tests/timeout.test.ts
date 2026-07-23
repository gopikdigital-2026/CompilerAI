import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TimeoutPolicy, RuntimeTimeoutError as ConnectorTimeoutError, DEFAULT_TIMEOUT_CONFIG } from '../src/index';

describe('TimeoutPolicy', () => {
  it('should resolve to operation timeout when provided', () => {
    const policy = new TimeoutPolicy();
    assert.equal(policy.resolveTimeout(5000), 5000);
  });

  it('should resolve to default timeout when not provided', () => {
    const policy = new TimeoutPolicy();
    assert.equal(policy.resolveTimeout(undefined), DEFAULT_TIMEOUT_CONFIG.defaultTimeoutMs);
  });

  it('should resolve to default timeout when 0', () => {
    const policy = new TimeoutPolicy();
    assert.equal(policy.resolveTimeout(0), DEFAULT_TIMEOUT_CONFIG.defaultTimeoutMs);
  });

  it('should cap at maxTimeoutMs', () => {
    const policy = new TimeoutPolicy();
    assert.equal(policy.resolveTimeout(200_000), DEFAULT_TIMEOUT_CONFIG.maxTimeoutMs);
  });

  it('should create abort signal that fires after timeout', async () => {
    const policy = new TimeoutPolicy();
    const { signal, timer } = policy.createAbortSignal(50);

    assert.equal(signal.aborted, false);
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(signal.aborted, true);
    policy.clearTimer(timer);
  });

  it('should create abort signal that is already aborted when external signal is aborted', () => {
    const policy = new TimeoutPolicy();
    const controller = new AbortController();
    controller.abort();

    const { signal, timer } = policy.createAbortSignal(5000, controller.signal);
    assert.equal(signal.aborted, true);
    policy.clearTimer(timer);
  });

  it('should abort when external signal aborts', async () => {
    const policy = new TimeoutPolicy();
    const controller = new AbortController();

    const { signal, timer } = policy.createAbortSignal(10_000, controller.signal);
    assert.equal(signal.aborted, false);

    setTimeout(() => controller.abort(), 50);
    await new Promise((r) => setTimeout(r, 80));

    assert.equal(signal.aborted, true);
    policy.clearTimer(timer);
  });

  it('should create timeout error with correct properties', () => {
    const policy = new TimeoutPolicy();
    const error = policy.createTimeoutError('test-conn', 'testOp', 'exec-1', 5000);
    assert.ok(error instanceof ConnectorTimeoutError);
    assert.equal(error.timeoutMs, 5000);
  });

  it('should detect timeout errors', () => {
    const policy = new TimeoutPolicy();
    const error = new ConnectorTimeoutError('test-conn', 'op', 'exec-1', 5000);
    assert.equal(policy.isTimeoutError(error), true);
  });

  it('should detect abort errors', () => {
    const policy = new TimeoutPolicy();
    const error = new DOMException('Aborted', 'AbortError');
    assert.equal(policy.isAbortError(error), true);
  });

  it('should not detect non-abort DOMExceptions as abort errors', () => {
    const policy = new TimeoutPolicy();
    const error = new DOMException('Some error', 'OperationError');
    assert.equal(policy.isAbortError(error), false);
  });

  it('should clear timer without error when null', () => {
    const policy = new TimeoutPolicy();
    policy.clearTimer(null);
    assert.ok(true);
  });
});
