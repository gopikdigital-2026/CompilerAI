// ─── Semantic memory ────────────────────────────────────────────────────────────
// Structured knowledge graph entries — entities, relations, facts.

import type { MemoryEntry } from './MemoryEntry';

/** Semantic memory entry — structured knowledge with entity-relation metadata. */
export interface SemanticMemory extends MemoryEntry {
  type: 'SEMANTIC';
  /** Subject entity (e.g., "Customer_X"). */
  subject:    string;
  /** Relation type (e.g., "has_contract_with"). */
  relation:   string;
  /** Object entity (e.g., "Company_Y"). */
  object:     string;
  /** Optional confidence weight for the triple. */
  tripleConfidence: number;
}
