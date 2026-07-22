// ─── Rate limiter ───────────────────────────────────────────────────────────────

export interface IRateLimiter {
  check(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: string };
  reset(): void;
}

interface RateBucket {
  count:    number;
  windowStart: number;
}

export class InMemoryRateLimiter implements IRateLimiter {
  private readonly buckets = new Map<string, RateBucket>();
  private readonly clock: () => number;

  constructor(clock?: () => number) {
    this.clock = clock ?? (() => Date.now());
  }

  check(key: string, limit: number, windowMs: number): { allowed: boolean; remaining: number; resetAt: string } {
    const now = this.clock();
    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStart >= windowMs) {
      this.buckets.set(key, { count: 1, windowStart: now });
      const resetAt = new Date(now + windowMs).toISOString();
      return { allowed: true, remaining: limit - 1, resetAt };
    }

    bucket.count++;
    const remaining = Math.max(0, limit - bucket.count);
    const resetAt = new Date(bucket.windowStart + windowMs).toISOString();
    return { allowed: bucket.count <= limit, remaining, resetAt };
  }

  reset(): void { this.buckets.clear(); }
}
