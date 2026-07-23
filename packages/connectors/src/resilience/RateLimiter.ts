import type { ConnectorId, UUID, ISOString } from '../types/index';
import type { RateLimitDetails } from '../errors/ConnectorRateLimitError';

export interface RateLimitConfig {
  capacity: number;
  refillRatePerSecond: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: ISOString;
  retryAfterMs: number;
}

export class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private readonly config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      capacity: config.capacity ?? 100,
      refillRatePerSecond: config.refillRatePerSecond ?? 10,
    };
  }

  check(connectorId: ConnectorId, organizationId: UUID, operation: string, userId?: UUID | null): RateLimitResult {
    const key = this.makeKey(connectorId, organizationId, operation, userId ?? null);
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { tokens: this.config.capacity, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    const elapsedMs = now - bucket.lastRefill;
    const refilled = (elapsedMs / 1000) * this.config.refillRatePerSecond;
    bucket.tokens = Math.min(this.config.capacity, bucket.tokens + refilled);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      const resetAt = new Date(now + (1 / this.config.refillRatePerSecond) * 1000).toISOString();
      return {
        allowed: true,
        remaining: Math.floor(bucket.tokens),
        limit: this.config.capacity,
        resetAt,
        retryAfterMs: 0,
      };
    }

    const retryAfterMs = Math.ceil((1 - bucket.tokens) / this.config.refillRatePerSecond * 1000);
    const resetAt = new Date(now + retryAfterMs).toISOString();
    return {
      allowed: false,
      remaining: 0,
      limit: this.config.capacity,
      resetAt,
      retryAfterMs,
    };
  }

  toRateLimitDetails(result: RateLimitResult): RateLimitDetails {
    return {
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.resetAt,
      retryAfterMs: result.retryAfterMs,
    };
  }

  reset(connectorId: ConnectorId, organizationId: UUID, operation: string, userId?: UUID | null): void {
    const key = this.makeKey(connectorId, organizationId, operation, userId ?? null);
    this.buckets.delete(key);
  }

  resetAll(): void {
    this.buckets.clear();
  }

  private makeKey(connectorId: ConnectorId, organizationId: UUID, operation: string, userId: UUID | null): string {
    return `${organizationId}:${connectorId}:${operation}:${userId ?? '*'}`;
  }
}
