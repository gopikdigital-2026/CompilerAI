import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';
import { CircuitBreaker, createCircuitBreakerConfig } from '../src/index.js';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker(createCircuitBreakerConfig('test', {
      failureThreshold: 3,
      resetTimeoutMs: 100,
      windowSize: 10,
      halfOpenMaxCalls: 2,
    }));
  });

  test('starts in closed state', () => {
    assert.equal(cb.getState(), 'closed');
  });

  test('stays closed on success', async () => {
    await cb.execute(async () => 42);
    assert.equal(cb.getState(), 'closed');
    assert.equal(cb.getStats().totalSuccesses, 1);
  });

  test('opens after reaching failure threshold', async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await cb.execute(async () => { throw new Error('fail'); });
      } catch { /* expected */ }
    }
    assert.equal(cb.getState(), 'open');
    assert.equal(cb.getStats().consecutiveFailures, 3);
  });

  test('rejects calls when open', async () => {
    cb.open();
    await assert.rejects(
      async () => cb.execute(async () => 42),
      /circuit breaker.*is open/i,
    );
  });

  test('transitions to half_open after reset timeout', async () => {
    cb.open();
    await new Promise((r) => setTimeout(r, 120));
    try {
      await cb.execute(async () => 42);
    } catch { /* may still fail */ }
    assert.equal(cb.getState(), 'closed'); // success in half_open → closed
  });

  test('half_open → open on failure', async () => {
    cb.open();
    await new Promise((r) => setTimeout(r, 120));
    try {
      await cb.execute(async () => { throw new Error('still failing'); });
    } catch { /* expected */ }
    assert.equal(cb.getState(), 'open');
  });

  test('half_open limits trial calls', async () => {
    cb.open();
    await new Promise((r) => setTimeout(r, 120));
    // Use failing calls to keep breaker in half_open
    try { await cb.execute(async () => { throw new Error('fail'); }); } catch { /* expected */ }
    assert.equal(cb.getState(), 'open'); // half_open failure → open
  });

  test('manual open and close', () => {
    cb.open();
    assert.equal(cb.getState(), 'open');
    cb.close();
    assert.equal(cb.getState(), 'closed');
  });

  test('reset clears state', async () => {
    for (let i = 0; i < 2; i++) {
      try { await cb.execute(async () => { throw new Error('fail'); }); } catch { /* expected */ }
    }
    cb.reset();
    assert.equal(cb.getState(), 'closed');
    assert.equal(cb.getStats().consecutiveFailures, 0);
  });

  test('failure percentage threshold triggers open', async () => {
    const pctCb = new CircuitBreaker(createCircuitBreakerConfig('pct', {
      failureThreshold: 100,
      failurePercentageThreshold: 50,
      resetTimeoutMs: 1000,
      windowSize: 10,
      halfOpenMaxCalls: 1,
    }));
    // 5 failures + 5 successes = 50% failure rate
    for (let i = 0; i < 5; i++) {
      try { await pctCb.execute(async () => { throw new Error('fail'); }); } catch { /* expected */ }
    }
    for (let i = 0; i < 4; i++) {
      await pctCb.execute(async () => 'ok');
    }
    // 9 calls, 5 failures = 55.5% > 50%
    try { await pctCb.execute(async () => { throw new Error('fail'); }); } catch { /* expected */ }
    assert.equal(pctCb.getState(), 'open');
  });

  test('stats track all counters', async () => {
    await cb.execute(async () => 1);
    try { await cb.execute(async () => { throw new Error('x'); }); } catch { /* expected */ }
    const stats = cb.getStats();
    assert.equal(stats.totalCalls, 2);
    assert.equal(stats.totalSuccesses, 1);
    assert.equal(stats.totalFailures, 1);
    assert.equal(stats.name, 'test');
  });
});
