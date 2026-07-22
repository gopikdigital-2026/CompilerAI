// ─── MemoryLifecycleManager ─────────────────────────────────────────────────────
// Manages TTL expiration, consolidation, and lifecycle stats.

import type { IMemoryLifecycleManager } from '../interfaces/IMemoryEngine';
import type { IMemoryRepository } from '../interfaces/IMemoryRepository';
import type { IMemoryConsolidator } from '../interfaces/IMemoryEngine';

export class MemoryLifecycleManager implements IMemoryLifecycleManager {
  constructor(
    private readonly repository: IMemoryRepository,
    private readonly consolidator: IMemoryConsolidator,
    private readonly clock: () => string,
  ) {}

  expire(now?: string): number {
    return this.repository.deleteExpired(now ?? this.clock());
  }

  consolidate(): number {
    const all = this.repository.findAll();
    const byOrg = new Map<string, typeof all>();
    for (const entry of all) {
      if (!byOrg.has(entry.organizationId)) byOrg.set(entry.organizationId, []);
      byOrg.get(entry.organizationId)!.push(entry);
    }
    let removed = 0;
    for (const entries of byOrg.values()) {
      const result = this.consolidator.consolidate(entries);
      for (const id of result.removed) {
        this.repository.delete(id);
        removed++;
      }
    }
    return removed;
  }

  getStats(): { total: number; expired: number; byType: Record<string, number> } {
    const all = this.repository.findAll();
    const byType: Record<string, number> = {};
    let expired = 0;
    const now = this.clock();

    for (const entry of all) {
      byType[entry.type] = (byType[entry.type] ?? 0) + 1;
      if (entry.expiresAt && new Date(entry.expiresAt).getTime() <= new Date(now).getTime()) {
        expired++;
      }
    }

    return { total: all.length, expired, byType };
  }
}
