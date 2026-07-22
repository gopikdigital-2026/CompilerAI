// ─── Distributed locks ──────────────────────────────────────────────────────────
// Prevents concurrent operations on the same resource.

import { LockAcquisitionError } from '../errors/InfrastructureErrors';

export interface LockInfo {
  ownerId:     string;
  resourceKey: string;
  acquiredAt:  string;
  expiresAt:   string;
}

export interface IDistributedLock {
  acquire(resourceKey: string, ownerId: string, ttlMs: number): Promise<LockInfo | null>;
  release(resourceKey: string, ownerId: string): Promise<boolean>;
  renew(resourceKey: string, ownerId: string, ttlMs: number): Promise<LockInfo | null>;
  getLock(resourceKey: string): LockInfo | null;
  getActiveLocks(): LockInfo[];
}

// ── In-memory distributed lock ──────────────────────────────────────────────────

export class InMemoryLock implements IDistributedLock {
  private readonly locks = new Map<string, LockInfo>();
  private readonly clock: () => number;

  constructor(clock?: () => number) {
    this.clock = clock ?? (() => Date.now());
  }

  async acquire(resourceKey: string, ownerId: string, ttlMs: number): Promise<LockInfo | null> {
    const now = this.clock();
    const existing = this.locks.get(resourceKey);

    if (existing) {
      if (existing.ownerId === ownerId) {
        return this.renew(resourceKey, ownerId, ttlMs);
      }
      if (new Date(existing.expiresAt).getTime() > now) {
        return null; // locked by someone else
      }
      // expired — steal it
    }

    const lockInfo: LockInfo = {
      ownerId,
      resourceKey,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: new Date(now + ttlMs).toISOString(),
    };
    this.locks.set(resourceKey, lockInfo);
    return lockInfo;
  }

  async release(resourceKey: string, ownerId: string): Promise<boolean> {
    const existing = this.locks.get(resourceKey);
    if (!existing || existing.ownerId !== ownerId) return false;
    this.locks.delete(resourceKey);
    return true;
  }

  async renew(resourceKey: string, ownerId: string, ttlMs: number): Promise<LockInfo | null> {
    const existing = this.locks.get(resourceKey);
    if (!existing || existing.ownerId !== ownerId) return null;
    const now = this.clock();
    const renewed: LockInfo = {
      ...existing,
      expiresAt: new Date(now + ttlMs).toISOString(),
    };
    this.locks.set(resourceKey, renewed);
    return renewed;
  }

  getLock(resourceKey: string): LockInfo | null {
    const lock = this.locks.get(resourceKey);
    if (!lock) return null;
    if (new Date(lock.expiresAt).getTime() < this.clock()) {
      this.locks.delete(resourceKey);
      return null;
    }
    return lock;
  }

  getActiveLocks(): LockInfo[] {
    const now = this.clock();
    return Array.from(this.locks.values()).filter(l => new Date(l.expiresAt).getTime() > now);
  }
}

// ── Lock helper with timeout ────────────────────────────────────────────────────

export class LockHelper {
  private readonly lock: IDistributedLock;

  constructor(lock: IDistributedLock) {
    this.lock = lock;
  }

  async withLock<T>(
    resourceKey: string,
    ownerId: string,
    ttlMs: number,
    timeoutMs: number,
    work: () => Promise<T>,
  ): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    let acquired: LockInfo | null = null;

    while (Date.now() < deadline) {
      acquired = await this.lock.acquire(resourceKey, ownerId, ttlMs);
      if (acquired) break;
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    if (!acquired) {
      throw new LockAcquisitionError(`Could not acquire lock for ${resourceKey} within ${timeoutMs}ms`);
    }

    try {
      return await work();
    } finally {
      await this.lock.release(resourceKey, ownerId);
    }
  }
}
