// ─── Session memory ─────────────────────────────────────────────────────────────
// Memory scoped to a user session, persists across multiple executions.

import type { MemoryEntry } from './MemoryEntry';

/** Session memory entry — survives across executions within a session. */
export interface SessionMemory extends MemoryEntry {
  type: 'SESSION';
  sessionId:   string;
  userId:      string | null;
  /** Interaction sequence number within the session. */
  sequenceNumber: number;
}
