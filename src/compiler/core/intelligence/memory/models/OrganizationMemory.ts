// ─── Organization memory ────────────────────────────────────────────────────────
// Long-lived memory shared across an organization.

import type { MemoryEntry } from './MemoryEntry';

/** Organization memory entry — shared knowledge accessible to all org members. */
export interface OrganizationMemory extends MemoryEntry {
  type: 'ORGANIZATION';
  /** Department or team that owns this knowledge. */
  department: string | null;
  /** Whether this entry has been verified by a human. */
  verified: boolean;
  /** Number of times this entry has been accessed. */
  accessCount: number;
}
