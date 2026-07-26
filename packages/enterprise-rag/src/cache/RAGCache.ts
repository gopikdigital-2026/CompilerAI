import type { CacheEntry, CacheStats, ICache } from '../models.js';

export class RAGCache implements ICache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private hits = 0;
  private misses = 0;
  private invalidated = 0;
  private readonly hashIndex = new Map<string, Set<string>>();

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check TTL
    if (this.isExpired(entry)) {
      this.store.delete(key);
      this.hashIndex.get(entry.contentHash)?.delete(key);
      this.misses++;
      return undefined;
    }

    entry.lastAccessedAt = new Date().toISOString();
    entry.accessCount++;
    this.hits++;
    return entry.value as T;
  }

  set<T>(key: string, value: T, contentHash: string, ttlMs: number = 3600_000): void {
    const now = new Date().toISOString();
    const entry: CacheEntry<T> = {
      key,
      value,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
      ttlMs,
      contentHash,
    };

    // Remove old hash index entry if updating
    const existing = this.store.get(key);
    if (existing) {
      this.hashIndex.get(existing.contentHash)?.delete(key);
    }

    this.store.set(key, entry as CacheEntry<unknown>);

    if (!this.hashIndex.has(contentHash)) {
      this.hashIndex.set(contentHash, new Set());
    }
    this.hashIndex.get(contentHash)!.add(key);
  }

  invalidate(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    this.store.delete(key);
    this.hashIndex.get(entry.contentHash)?.delete(key);
    this.invalidated++;
    return true;
  }

  invalidateByHash(hash: string): number {
    const keys = this.hashIndex.get(hash);
    if (!keys || keys.size === 0) return 0;
    const count = keys.size;
    for (const key of keys) {
      this.store.delete(key);
    }
    this.hashIndex.delete(hash);
    this.invalidated += count;
    return count;
  }

  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    for (const key of Array.from(this.store.keys())) {
      if (regex.test(key)) {
        const entry = this.store.get(key)!;
        this.store.delete(key);
        this.hashIndex.get(entry.contentHash)?.delete(key);
        count++;
      }
    }
    this.invalidated += count;
    return count;
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
    this.hashIndex.clear();
    this.hits = 0;
    this.misses = 0;
    this.invalidated = 0;
  }

  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.store.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      invalidated: this.invalidated,
    };
  }

  private isExpired(entry: CacheEntry<unknown>): boolean {
    const ageMs = Date.now() - new Date(entry.createdAt).getTime();
    return ageMs > entry.ttlMs;
  }

  // Specific cache key builders
  static embeddingKey(text: string): string {
    return `emb:${this.hash(text)}`;
  }

  static queryKey(query: string, orgId: string, mode: string): string {
    return `query:${orgId}:${mode}:${this.hash(query)}`;
  }

  static resultKey(query: string, orgId: string): string {
    return `result:${orgId}:${this.hash(query)}`;
  }

  private static hash(text: string): string {
    let h = 0;
    for (let i = 0; i < text.length; i++) {
      h = ((h << 5) - h + text.charCodeAt(i)) | 0;
    }
    return Math.abs(h).toString(16);
  }
}
