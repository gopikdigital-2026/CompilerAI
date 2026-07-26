import type {
  DecisionHistoryEntry,
  ISharedMemory,
  MemoryEntry,
  MemoryEntryType,
} from '../models.js';

export class SharedMemory implements ISharedMemory {
  private readonly store = new Map<string, MemoryEntry>();
  private readonly decisionHistory: DecisionHistoryEntry[] = [];

  set(entry: MemoryEntry): void {
    this.store.set(entry.key, entry);
  }

  get(key: string): MemoryEntry | undefined {
    return this.store.get(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  list(type?: MemoryEntryType): MemoryEntry[] {
    const all = Array.from(this.store.values());
    if (!type) return all;
    return all.filter((e) => e.type === type);
  }

  getDecisionHistory(): DecisionHistoryEntry[] {
    return [...this.decisionHistory];
  }

  recordDecision(entry: DecisionHistoryEntry): void {
    this.decisionHistory.push(entry);
  }

  clear(): void {
    this.store.clear();
    this.decisionHistory.length = 0;
  }
}
