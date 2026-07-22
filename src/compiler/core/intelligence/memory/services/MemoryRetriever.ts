// ─── MemoryRetriever ────────────────────────────────────────────────────────────
// Retrieves memory entries from the repository with deterministic filtering.

import type { IMemoryRetriever } from '../interfaces/IMemoryEngine';
import type { MemoryQuery, MemoryRetrievalResult } from '../models/MemoryQuery';
import type { IMemoryRepository } from '../interfaces/IMemoryRepository';

export class MemoryRetriever implements IMemoryRetriever {
  constructor(private readonly repository: IMemoryRepository) {}

  retrieve(query: MemoryQuery): MemoryRetrievalResult {
    const start = Date.now();
    const entries = this.repository.query(query);
    const retrievalMs = Date.now() - start;
    return { entries, totalCount: entries.length, retrievalMs };
  }
}
