// ─── Memory provider interface ────────────────────────────────────────────────

export interface MemoryEntry {
  key:       string;
  value:     unknown;
  addedAt:   number;    // unix ms
  ttlMs?:    number;    // optional expiry
}

export interface IMemoryProvider {
  /** Store a value under a namespaced key. */
  set(sessionId: string, key: string, value: unknown, ttlMs?: number): void;

  /** Retrieve a value. Returns undefined if missing or expired. */
  get<T = unknown>(sessionId: string, key: string): T | undefined;

  /** Retrieve all entries for a session. */
  entries(sessionId: string): MemoryEntry[];

  /** Remove a single key. */
  delete(sessionId: string, key: string): void;

  /** Clear all memory for a session. */
  clear(sessionId: string): void;

  /** Return token/byte estimate for the session context window. */
  contextSize(sessionId: string): number;
}
