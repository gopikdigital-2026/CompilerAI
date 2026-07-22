// ─── Memory query and result ────────────────────────────────────────────────────
// Query filters and retrieval results for the Memory Intelligence Engine.

import type { MemoryEntry } from './MemoryEntry';
import type { MemoryType, MemorySensitivity } from './MemoryTypes';

export interface MemoryQuery {
  organizationId:  string;
  types?:          MemoryType[];
  sensitivity?:    MemorySensitivity[];
  executionId?:    string;
  sessionId?:      string;
  tags?:           string[];
  /** Full-text search within content. */
  searchText?:     string;
  /** Minimum confidence threshold (0–100). */
  minConfidence?:  number;
  /** Minimum relevance threshold (0–100). */
  minRelevance?:   number;
  /** Maximum number of results to return. */
  limit?:          number;
  /** Include expired entries. */
  includeExpired?: boolean;
}

export interface MemoryRetrievalResult {
  entries:    MemoryEntry[];
  totalCount: number;
  /** Time spent retrieving in milliseconds. */
  retrievalMs: number;
}
