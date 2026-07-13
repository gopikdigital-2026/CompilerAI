import type { IMemoryProvider, MemoryEntry } from '../interfaces/IMemoryProvider';

// ─── In-process working memory ─────────────────────────────────────────────────
// One instance per compilation run; cleared automatically when done.

type SessionStore = Map<string, MemoryEntry>;

export class WorkingMemory implements IMemoryProvider {
  private readonly store = new Map<string, SessionStore>();

  private getSession(sessionId: string): SessionStore {
    let session = this.store.get(sessionId);
    if (!session) {
      session = new Map();
      this.store.set(sessionId, session);
    }
    return session;
  }

  set(sessionId: string, key: string, value: unknown, ttlMs?: number): void {
    const session = this.getSession(sessionId);
    session.set(key, { key, value, addedAt: Date.now(), ttlMs });
  }

  get<T = unknown>(sessionId: string, key: string): T | undefined {
    const entry = this.getSession(sessionId).get(key);
    if (!entry) return undefined;
    if (entry.ttlMs && Date.now() - entry.addedAt > entry.ttlMs) {
      this.getSession(sessionId).delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  entries(sessionId: string): MemoryEntry[] {
    const now = Date.now();
    const result: MemoryEntry[] = [];
    for (const entry of this.getSession(sessionId).values()) {
      if (!entry.ttlMs || now - entry.addedAt <= entry.ttlMs) {
        result.push(entry);
      }
    }
    return result;
  }

  delete(sessionId: string, key: string): void {
    this.getSession(sessionId).delete(key);
  }

  clear(sessionId: string): void {
    this.store.delete(sessionId);
  }

  contextSize(sessionId: string): number {
    // Rough estimate: serialized JSON character count / 4 ≈ tokens
    const json = JSON.stringify(
      Object.fromEntries(
        this.entries(sessionId).map(e => [e.key, e.value])
      )
    );
    return Math.ceil(json.length / 4);
  }
}
