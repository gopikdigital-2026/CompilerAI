// ─── Working memory ─────────────────────────────────────────────────────────────
// Short-lived memory for the current execution context.

import type { MemoryEntry } from './MemoryEntry';

/** Working memory entry — ephemeral, scoped to a single execution. */
export interface WorkingMemory extends MemoryEntry {
  type: 'WORKING';
  /** Context window position (0 = oldest). */
  position: number;
  /** Whether this entry is currently active in the context window. */
  active: boolean;
}
