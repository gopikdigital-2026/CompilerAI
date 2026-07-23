import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter, RuntimeRateLimitError as ConnectorRateLimitError } from '../src/index';

const CID = 'test-conn' as never;
const OID = 'org-1';

describe('RateLimiter — Token Bucket', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({ capacity: 5, refillRatePerSecond: 1 });
  });

  it('should allow requests within capacity', () => {
    for (let i = 0; i < 5; i++) {
      const result = limiter.check(CID, OID, 'op1');
      assert.equal(result.allowed, true);
    }
  });

  it('should deny requests exceeding capacity', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check(CID, OID, 'op1');
    }
    const result = limiter.check(CID, OID, 'op1');
    assert.equal(result.allowed, false);
  });

  it('should report remaining tokens', () => {
    limiter.check(CID, OID, 'op1');
    limiter.check(CID, OID, 'op1');
    const result = limiter.check(CID, OID, 'op1');
    assert.equal(result.allowed, true);
    assert.equal(result.remaining, 2);
  });

  it('should report limit from config', () => {
    const result = limiter.check(CID, OID, 'op1');
    assert.equal(result.limit, 5);
  });

  it('should report resetAt timestamp', () => {
    const result = limiter.check(CID, OID, 'op1');
    assert.ok(result.resetAt);
  });

  it('should report retryAfterMs when denied', () => {
    for (let i = 0; i < 5; i++) {
      limiter.check(CID, OID, 'op1');
    }
    const result = limiter.check(CID, OID, 'op1');
    assert.equal(result.allowed, false);
    assert.ok(result.retryAfterMs > 0);
  });

  it('should report retryAfterMs 0 when allowed', () => {
    const result = limiter.check(CID, OID, 'op1');
    assert.equal(result.retryAfterMs, 0);
  });
});

describe('RateLimiter — Token Refill', () => {
  it('should refill tokens over time', async () => {
    const limiter = new RateLimiter({ capacity: 2, refillRatePerSecond: 10 });

    limiter.check(CID, OID, 'op1');
    limiter.check(CID, OID, 'op1');
    const denied = limiter.check(CID, OID, 'op1');
    assert.equal(denied.allowed, false);

    await new Promise((r) => setTimeout(r, 150));
    const allowed = limiter.check(CID, OID, 'op1');
    assert.equal(allowed.allowed, true);
  });
});

describe('RateLimiter — Isolation', () => {
  it('should isolate by connector+org+operation+user', () => {
    const limiter = new RateLimiter({ capacity: 1, refillRatePerSecond: 0.1 });

    const r1 = limiter.check(CID, OID, 'op1', 'user-1');
    assert.equal(r1.allowed, true);

    const r2 = limiter.check(CID, OID, 'op1', 'user-2');
    assert.equal(r2.allowed, true);

    const r3 = limiter.check(CID, OID, 'op1', 'user-1');
    assert.equal(r3.allowed, false);
  });

  it('should isolate by operation', () => {
    const limiter = new RateLimiter({ capacity: 1, refillRatePerSecond: 0.1 });

    assert.equal(limiter.check(CID, OID, 'op1').allowed, true);
    assert.equal(limiter.check(CID, OID, 'op2').allowed, true);
    assert.equal(limiter.check(CID, OID, 'op1').allowed, false);
  });
});

describe('RateLimiter — Reset', () => {
  it('should reset specific bucket', () => {
    const limiter = new RateLimiter({ capacity: 1, refillRatePerSecond: 0.1 });
    limiter.check(CID, OID, 'op1');
    assert.equal(limiter.check(CID, OID, 'op1').allowed, false);

    limiter.reset(CID, OID, 'op1');
    assert.equal(limiter.check(CID, OID, 'op1').allowed, true);
  });

  it('should reset all buckets', () => {
    const limiter = new RateLimiter({ capacity: 1, refillRatePerSecond: 0.1 });
    limiter.check(CID, OID, 'op1');
    limiter.check(CID, OID, 'op2');

    limiter.resetAll();
    assert.equal(limiter.check(CID, OID, 'op1').allowed, true);
    assert.equal(limiter.check(CID, OID, 'op2').allowed, true);
  });
});

describe('RateLimiter — toRateLimitDetails', () => {
  it('should convert result to details', () => {
    const limiter = new RateLimiter({ capacity: 10, refillRatePerSecond: 1 });
    const result = limiter.check(CID, OID, 'op1');
    const details = limiter.toRateLimitDetails(result);
    assert.equal(details.limit, 10);
    assert.equal(details.remaining, 9);
    assert.equal(details.retryAfterMs, 0);
  });
});

describe('RateLimiter — Error Class', () => {
  it('should create ConnectorRateLimitError with correct properties', () => {
    const error = new ConnectorRateLimitError('conn', 'op', 'exec-1', {
      limit: 100,
      remaining: 0,
      resetAt: '2026-01-01T00:00:00.000Z',
      retryAfterMs: 5000,
    });
    assert.equal(error.errorCode, 'RATE_LIMIT_ERROR');
    assert.equal(error.retryable, true);
    assert.equal(error.rateLimit.limit, 100);
    assert.equal(error.rateLimit.retryAfterMs, 5000);
  });
});
