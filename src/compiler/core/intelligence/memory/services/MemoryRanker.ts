// ─── MemoryRanker ───────────────────────────────────────────────────────────────
// Ranks memory entries by a deterministic relevance+confidence score.

import type { IMemoryRanker } from '../interfaces/IMemoryEngine';
import type { MemoryEntry } from '../models/MemoryEntry';
import type { MemoryQuery } from '../models/MemoryQuery';

export class MemoryRanker implements IMemoryRanker {
  /** Weight of confidence vs relevance in the composite score. */
  private readonly confidenceWeight: number;
  private readonly relevanceWeight: number;

  constructor(confidenceWeight = 0.4, relevanceWeight = 0.6) {
    this.confidenceWeight = confidenceWeight;
    this.relevanceWeight = relevanceWeight;
  }

  rank(entries: MemoryEntry[], _query?: MemoryQuery): MemoryEntry[] {
    return [...entries].sort((a, b) => {
      const scoreA = a.confidence * this.confidenceWeight + a.relevance * this.relevanceWeight;
      const scoreB = b.confidence * this.confidenceWeight + b.relevance * this.relevanceWeight;
      if (scoreB !== scoreA) return scoreB - scoreA;
      // Tiebreaker: earlier createdAt first (deterministic).
      return a.createdAt.localeCompare(b.createdAt);
    });
  }
}
