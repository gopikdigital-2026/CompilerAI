// ─── Cache abstraction ──────────────────────────────────────────────────────────
// Organization-scoped cache with TTL and invalidation.

export interface CacheEntry<T> {
  value:      T;
  expiresAt:  number;
  createdAt:  number;
}

export interface ICache {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T, ttlMs?: number): void;
  delete(key: string): boolean;
  invalidate(namespace: string): number;
  has(key: string): boolean;
  clear(): void;
  size(): number;
  stats(): CacheStats;
}

export interface CacheStats {
  hits:    number;
  misses:  number;
  entries: number;
  hitRate: number;
}

// ── Cache key builder ───────────────────────────────────────────────────────────

export class CacheKeyBuilder {
  static build(organizationId: string, ...parts: string[]): string {
    return `org:${organizationId}:${parts.join(':')}`;
  }

  static workflow(workflowId: string, organizationId: string): string {
    return this.build(organizationId, 'workflow', workflowId);
  }

  static capabilities(organizationId: string): string {
    return this.build(organizationId, 'capabilities');
  }

  static permissions(actorId: string, organizationId: string): string {
    return this.build(organizationId, 'perms', actorId);
  }

  static toolRegistry(organizationId: string): string {
    return this.build(organizationId, 'tools');
  }
}

// ── Cache policy ────────────────────────────────────────────────────────────────

export interface CachePolicy {
  ttlMs:       number;
  maxEntries:  number;
  namespace:   string;
}

export const DEFAULT_CACHE_POLICIES = {
  capabilities:  { ttlMs: 300_000, maxEntries: 100, namespace: 'capabilities' },
  workflows:     { ttlMs: 60_000,  maxEntries: 500, namespace: 'workflows' },
  permissions:   { ttlMs: 30_000,  maxEntries: 1000, namespace: 'permissions' },
  toolRegistry:  { ttlMs: 120_000, maxEntries: 200, namespace: 'tools' },
} satisfies Record<string, CachePolicy>;

// ── In-memory cache ─────────────────────────────────────────────────────────────

export class InMemoryCache implements ICache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private hitCount = 0;
  private missCount = 0;
  private readonly clock: () => number;

  constructor(defaultTtlMs = 60_000, maxEntries = 1000, clock?: () => number) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
    this.clock = clock ?? (() => Date.now());
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.missCount++;
      return null;
    }
    if (entry.expiresAt < this.clock()) {
      this.store.delete(key);
      this.missCount++;
      return null;
    }
    this.hitCount++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (this.store.size >= this.maxEntries) {
      this.evictOldest();
    }
    const now = this.clock();
    this.store.set(key, {
      value,
      createdAt: now,
      expiresAt: now + (ttlMs ?? this.defaultTtlMs),
    });
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  invalidate(namespace: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.includes(`:${namespace}:`)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt < this.clock()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.store.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  size(): number {
    return this.store.size;
  }

  stats(): CacheStats {
    const total = this.hitCount + this.missCount;
    return {
      hits: this.hitCount,
      misses: this.missCount,
      entries: this.store.size,
      hitRate: total > 0 ? this.hitCount / total : 0,
    };
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [key, entry] of this.store) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    if (oldestKey) this.store.delete(oldestKey);
  }
}

// ── Tenant-safe cache wrapper ───────────────────────────────────────────────────

export class TenantScopedCache {
  private readonly cache: ICache;

  constructor(cache: ICache) {
    this.cache = cache;
  }

  get<T>(organizationId: string, key: string): T | null {
    return this.cache.get<T>(CacheKeyBuilder.build(organizationId, key));
  }

  set<T>(organizationId: string, key: string, value: T, ttlMs?: number): void {
    this.cache.set(CacheKeyBuilder.build(organizationId, key), value, ttlMs);
  }

  invalidateOrg(organizationId: string): number {
    return this.cache.invalidate(organizationId);
  }

  delete(organizationId: string, key: string): boolean {
    return this.cache.delete(CacheKeyBuilder.build(organizationId, key));
  }
}
