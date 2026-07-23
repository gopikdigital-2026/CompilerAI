import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RetryPolicy, ExponentialBackoff, DEFAULT_RETRY_CONFIG } from '../src/index';

describe('RetryPolicy', () => {
  it('should allow retry for retryable error codes', () => {
    const policy = new RetryPolicy();
    const decision = policy.shouldRetry('PROVIDER_ERROR', 1, false);
    assert.equal(decision.shouldRetry, true);
    assert.equal(decision.attempt, 2);
  });

  it('should not allow retry for non-retryable error codes', () => {
    const policy = new RetryPolicy();
    const decision = policy.shouldRetry('AUTHENTICATION_ERROR', 1, false);
    assert.equal(decision.shouldRetry, false);
  });

  it('should not allow retry for non-retryable VALIDATION_ERROR', () => {
    const policy = new RetryPolicy();
    const decision = policy.shouldRetry('VALIDATION_ERROR', 1, false);
    assert.equal(decision.shouldRetry, false);
  });

  it('should allow retry for non-listed codes when idempotent', () => {
    const policy = new RetryPolicy();
    const decision = policy.shouldRetry('UNKNOWN_ERROR', 1, true);
    assert.equal(decision.shouldRetry, true);
  });

  it('should not allow retry for non-listed codes when not idempotent', () => {
    const policy = new RetryPolicy();
    const decision = policy.shouldRetry('UNKNOWN_ERROR', 1, false);
    assert.equal(decision.shouldRetry, false);
  });

  it('should stop retrying after maxAttempts', () => {
    const policy = new RetryPolicy({ maxAttempts: 3 });
    const decision = policy.shouldRetry('PROVIDER_ERROR', 3, true);
    assert.equal(decision.shouldRetry, false);
  });

  it('should compute exponential delay with backoff multiplier', () => {
    const policy = new RetryPolicy({
      initialDelayMs: 100,
      maxDelayMs: 10_000,
      backoffMultiplier: 2,
      jitter: false,
    });
    assert.equal(policy.computeDelay(1), 100);
    assert.equal(policy.computeDelay(2), 200);
    assert.equal(policy.computeDelay(3), 400);
    assert.equal(policy.computeDelay(4), 800);
  });

  it('should cap delay at maxDelayMs', () => {
    const policy = new RetryPolicy({
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
      jitter: false,
    });
    assert.equal(policy.computeDelay(10), 5000);
  });

  it('should add jitter when enabled', () => {
    const policy = new RetryPolicy({
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      backoffMultiplier: 2,
      jitter: true,
    });
    const delay = policy.computeDelay(1);
    // base is 1000, jitter range is ±250
    assert.ok(delay >= 750 && delay <= 1250, `delay ${delay} outside jitter range`);
  });

  it('should apply retry-after when provided', () => {
    const policy = new RetryPolicy({ maxDelayMs: 5000 });
    const delay = policy.applyRetryAfter(2000, 1);
    assert.equal(delay, 2000);
  });

  it('should cap retry-after at maxDelayMs', () => {
    const policy = new RetryPolicy({ maxDelayMs: 5000 });
    const delay = policy.applyRetryAfter(10000, 1);
    assert.equal(delay, 5000);
  });

  it('should fall back to computed delay when retry-after is 0', () => {
    const policy = new RetryPolicy({
      initialDelayMs: 200,
      maxDelayMs: 5000,
      jitter: false,
    });
    const delay = policy.applyRetryAfter(0, 1);
    assert.equal(delay, 200);
  });

  it('should expose maxAttempts', () => {
    const policy = new RetryPolicy({ maxAttempts: 5 });
    assert.equal(policy.maxAttempts, 5);
  });

  it('should export DEFAULT_RETRY_CONFIG', () => {
    assert.equal(DEFAULT_RETRY_CONFIG.maxAttempts, 3);
    assert.equal(DEFAULT_RETRY_CONFIG.backoffMultiplier, 2);
  });
});

describe('ExponentialBackoff', () => {
  it('should compute delay without jitter', () => {
    const backoff = new ExponentialBackoff({
      initialDelayMs: 100,
      maxDelayMs: 10_000,
      multiplier: 2,
      jitter: false,
    });
    assert.equal(backoff.delayForAttempt(1), 100);
    assert.equal(backoff.delayForAttempt(2), 200);
    assert.equal(backoff.delayForAttempt(3), 400);
  });

  it('should cap delay at maxDelayMs', () => {
    const backoff = new ExponentialBackoff({
      initialDelayMs: 1000,
      maxDelayMs: 5000,
      multiplier: 2,
      jitter: false,
    });
    assert.equal(backoff.delayForAttempt(10), 5000);
  });

  it('should resolve sleep immediately for 0 delay', async () => {
    const backoff = new ExponentialBackoff({
      initialDelayMs: 0,
      maxDelayMs: 10,
      multiplier: 1,
      jitter: false,
    });
    await backoff.sleep(1);
    // Should not hang
    assert.ok(true);
  });

  it('should reject sleep when signal is already aborted', async () => {
    const backoff = new ExponentialBackoff({
      initialDelayMs: 5000,
      maxDelayMs: 10_000,
      multiplier: 1,
      jitter: false,
    });
    const controller = new AbortController();
    controller.abort();

    await assert.rejects(
      backoff.sleep(1, controller.signal),
      (err: unknown) => err instanceof DOMException && err.name === 'AbortError',
    );
  });

  it('should reject sleep when signal aborts during wait', async () => {
    const backoff = new ExponentialBackoff({
      initialDelayMs: 5000,
      maxDelayMs: 10_000,
      multiplier: 1,
      jitter: false,
    });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 50);

    await assert.rejects(
      backoff.sleep(1, controller.signal),
      (err: unknown) => err instanceof DOMException && err.name === 'AbortError',
    );
  });
});
