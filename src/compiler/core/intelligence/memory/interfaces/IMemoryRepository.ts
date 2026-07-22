// ─── IMemoryRepository ──────────────────────────────────────────────────────────
// Repository abstraction for memory persistence. In-memory default;
// designed for future Supabase/DB adapters.

import type { MemoryEntry } from '../models/MemoryEntry';
import type { MemoryQuery } from '../models/MemoryQuery';

export interface IMemoryRepository {
  save(entry: MemoryEntry): void;
  findById(memoryId: string): MemoryEntry | null;
  findByOrganization(organizationId: string): MemoryEntry[];
  findAll(): MemoryEntry[];
  query(query: MemoryQuery): MemoryEntry[];
  delete(memoryId: string): boolean;
  deleteExpired(now: string): number;
  deleteByOrganization(organizationId: string): number;
  count(): number;
  clear(): void;
}
