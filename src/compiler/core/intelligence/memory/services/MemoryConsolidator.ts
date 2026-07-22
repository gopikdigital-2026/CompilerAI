// ─── MemoryConsolidator ─────────────────────────────────────────────────────────
// Deduplicates and consolidates memory entries within an organization.

import type { IMemoryConsolidator } from '../interfaces/IMemoryEngine';
import type { MemoryEntry } from '../models/MemoryEntry';

export class MemoryConsolidator implements IMemoryConsolidator {
  consolidate(entries: MemoryEntry[]): { consolidated: MemoryEntry[]; removed: string[] } {
    const seen = new Map<string, MemoryEntry>();
    const removed: string[] = [];

    // Sort by createdAt ascending so the earliest entry is kept.
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    for (const entry of sorted) {
      const key = `${entry.organizationId}|${entry.type}|${entry.contentHash}`;
      if (seen.has(key)) {
        removed.push(entry.memoryId);
      } else {
        seen.set(key, entry);
      }
    }

    return { consolidated: Array.from(seen.values()), removed };
  }
}
