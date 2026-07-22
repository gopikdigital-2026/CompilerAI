// ─── InMemoryMemoryRepository ───────────────────────────────────────────────────
// Default in-memory repository implementation. Swappable for future DB adapters.

import type { MemoryEntry } from '../models/MemoryEntry';
import type { MemoryQuery } from '../models/MemoryQuery';
import type { IMemoryRepository } from '../interfaces/IMemoryRepository';
import { isExpired } from '../policies/MemoryPolicies';

export class InMemoryMemoryRepository implements IMemoryRepository {
  private readonly store = new Map<string, MemoryEntry>();
  private readonly orgIndex = new Map<string, Set<string>>();
  private readonly clock: () => string;

  constructor(clock: () => string = () => new Date().toISOString()) {
    this.clock = clock;
  }

  save(entry: MemoryEntry): void {
    this.store.set(entry.memoryId, entry);
    if (!this.orgIndex.has(entry.organizationId)) this.orgIndex.set(entry.organizationId, new Set());
    this.orgIndex.get(entry.organizationId)!.add(entry.memoryId);
  }

  findById(memoryId: string): MemoryEntry | null {
    return this.store.get(memoryId) ?? null;
  }

  findByOrganization(organizationId: string): MemoryEntry[] {
    const ids = this.orgIndex.get(organizationId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.store.get(id)).filter((e): e is MemoryEntry => e !== undefined);
  }

  findAll(): MemoryEntry[] {
    return Array.from(this.store.values());
  }

  query(query: MemoryQuery): MemoryEntry[] {
    let results = this.findByOrganization(query.organizationId);

    if (query.types) results = results.filter(e => query.types!.includes(e.type));
    if (query.sensitivity) results = results.filter(e => query.sensitivity!.includes(e.sensitivity));
    if (query.executionId) results = results.filter(e => e.executionId === query.executionId);
    if (query.tags && query.tags.length > 0) results = results.filter(e => query.tags!.some(t => e.tags.includes(t)));
    if (query.searchText) {
      const q = query.searchText.toLowerCase();
      results = results.filter(e => e.content.toLowerCase().includes(q));
    }
    if (query.minConfidence !== undefined) results = results.filter(e => e.confidence >= query.minConfidence!);
    if (query.minRelevance !== undefined) results = results.filter(e => e.relevance >= query.minRelevance!);

    if (!query.includeExpired) {
      const now = this.clock();
      results = results.filter(e => !isExpired(e, now));
    }

    if (query.limit) results = results.slice(0, query.limit);
    return results;
  }

  delete(memoryId: string): boolean {
    const entry = this.store.get(memoryId);
    if (!entry) return false;
    this.store.delete(memoryId);
    this.orgIndex.get(entry.organizationId)?.delete(memoryId);
    return true;
  }

  deleteExpired(now: string): number {
    let count = 0;
    for (const [id, entry] of this.store) {
      if (isExpired(entry, now)) {
        this.store.delete(id);
        this.orgIndex.get(entry.organizationId)?.delete(id);
        count++;
      }
    }
    return count;
  }

  deleteByOrganization(organizationId: string): number {
    const ids = this.orgIndex.get(organizationId);
    if (!ids) return 0;
    const count = ids.size;
    for (const id of ids) this.store.delete(id);
    this.orgIndex.delete(organizationId);
    return count;
  }

  count(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
    this.orgIndex.clear();
  }
}
