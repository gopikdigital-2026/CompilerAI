import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { RetryEngine, createRetryConfig, isTransientError } from '../src/index.js';

describe('RetryEngine', () => {
  const engine = new RetryEngine();

  test('succeeds on first attempt', async () => {
    const result = await engine.execute(async () => 42, createRetryConfig({ maxAttempts: 3 }));
    assert.equal(result.success, true);
    assert.equal(result.result, 42);
    assert.equal(result.attempts, 1);
    assert.equal(result.delays.length, 0);
  });

  test('retries on failure and eventually succeeds', async () => {
    let calls = 0;
    const result = await engine.execute(async () => {
      calls++;
      if (calls < 3) throw new Error('transient');
      return 'ok';
    }, createRetryConfig({ maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 10 }));
    assert.equal(result.success, true);
    assert.equal(result.result, 'ok');
    assert.equal(result.attempts, 3);
    assert.equal(result.delays.length, 2);
  });

  test('fails after max attempts', async () => {
    const result = await engine.execute(async () => {
      throw new Error('always fails');
    }, createRetryConfig({ maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 }));
    assert.equal(result.success, false);
    assert.equal(result.attempts, 3);
    assert.ok(result.error instanceof Error);
  });

  test('exponential backoff increases delay', async () => {
    let calls = 0;
    const result = await engine.execute(async () => {
      calls++;
      if (calls < 4) throw new Error('retry');
      return 'ok';
    }, createRetryConfig({ maxAttempts: 5, strategy: 'exponential', baseDelayMs: 10, maxDelayMs: 1000, jitter: false }));
    assert.equal(result.delays.length, 3);
    assert.ok(result.delays[1] > result.delays[0]);
    assert.ok(result.delays[2] > result.delays[1]);
  });

  test('linear backoff increases linearly', async () => {
    let calls = 0;
    const result = await engine.execute(async () => {
      calls++;
      if (calls < 4) throw new Error('retry');
      return 'ok';
    }, createRetryConfig({ maxAttempts: 5, strategy: 'linear', baseDelayMs: 10, maxDelayMs: 1000, jitter: false }));
    assert.equal(result.delays.length, 3);
    assert.equal(result.delays[0], 10);
    assert.equal(result.delays[1], 20);
    assert.equal(result.delays[2], 30);
  });

  test('fixed backoff uses constant delay', async () => {
    let calls = 0;
    const result = await engine.execute(async () => {
      calls++;
      if (calls < 3) throw new Error('retry');
      return 'ok';
    }, createRetryConfig({ maxAttempts: 5, strategy: 'fixed', baseDelayMs: 15, maxDelayMs: 1000, jitter: false }));
    assert.equal(result.delays[0], 15);
    assert.equal(result.delays[1], 15);
  });

  test('jitter adds randomness to delay', async () => {
    let calls = 0;
    const result = await engine.execute(async () => {
      calls++;
      if (calls < 3) throw new Error('retry');
      return 'ok';
    }, createRetryConfig({ maxAttempts: 5, strategy: 'fixed', baseDelayMs: 100, maxDelayMs: 1000, jitter: true, jitterFactor: 0.5 }));
    assert.ok(result.delays[0] !== 100 || result.delays[1] !== 100);
  });

  test('max delay caps the backoff', async () => {
    const result = await engine.execute(async () => {
      throw new Error('fail');
    }, createRetryConfig({ maxAttempts: 5, strategy: 'exponential', baseDelayMs: 100, maxDelayMs: 50, jitter: false }));
    assert.ok(result.delays.every((d) => d <= 50));
  });

  test('non-retryable error stops immediately', async () => {
    const config = createRetryConfig({
      maxAttempts: 5,
      isRetryable: (err) => {
        if (err instanceof Error) return !err.message.includes('validation');
        return true;
      },
    });
    const result = await engine.execute(async () => {
      throw new Error('validation error');
    }, config);
    assert.equal(result.success, false);
    assert.equal(result.attempts, 1);
    assert.equal(result.delays.length, 0);
  });

  test('totalDelayMs is sum of all delays', async () => {
    let calls = 0;
    const result = await engine.execute(async () => {
      calls++;
      if (calls < 3) throw new Error('retry');
      return 'ok';
    }, createRetryConfig({ maxAttempts: 5, strategy: 'fixed', baseDelayMs: 10, maxDelayMs: 100, jitter: false }));
    assert.equal(result.totalDelayMs, result.delays.reduce((a, b) => a + b, 0));
  });

  test('isTransientError identifies recoverable errors', () => {
    assert.equal(isTransientError(new Error('timeout')), true);
    assert.equal(isTransientError(new Error('connection refused')), true);
    assert.equal(isTransientError(new Error('unauthorized')), false);
    assert.equal(isTransientError(new Error('forbidden')), false);
    assert.equal(isTransientError(new Error('not found')), false);
  });
});
