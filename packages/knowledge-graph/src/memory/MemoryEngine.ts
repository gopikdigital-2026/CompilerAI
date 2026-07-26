import type {
  DecisionRecord,
  IMemoryEngine,
  MemoryRecord,
  MemorySummary,
} from '../models.js';

let memIdCounter = 0;
let decIdCounter = 0;
let sumIdCounter = 0;

export class MemoryEngine implements IMemoryEngine {
  private readonly memories = new Map<string, MemoryRecord>();
  private readonly decisions: DecisionRecord[] = [];
  private readonly summaries = new Map<string, MemorySummary[]>();

  store(record: Omit<MemoryRecord, 'id' | 'createdAt' | 'lastAccessedAt' | 'accessCount'>): MemoryRecord {
    const id = `mem-${++memIdCounter}`;
    const now = new Date().toISOString();
    const full: MemoryRecord = {
      ...record,
      id,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    };
    this.memories.set(this.key(record.key, record.agentId), full);
    return full;
  }

  retrieve(key: string, agentId: string): MemoryRecord | undefined {
    const record = this.memories.get(this.key(key, agentId));
    if (record) {
      record.lastAccessedAt = new Date().toISOString();
      record.accessCount++;
    }
    return record;
  }

  retrieveContextual(agentId: string, context: Record<string, unknown>, limit: number = 10): MemoryRecord[] {
    const all = Array.from(this.memories.values()).filter((m) => m.agentId === agentId || m.type === 'shared_context');

    // Score by context overlap
    const scored = all.map((record) => {
      let score = 0;
      for (const [key, value] of Object.entries(context)) {
        if (record.context[key] === value) score += 2;
        else if (record.context[key] !== undefined) score += 0.5;
      }
      // Boost by importance and recency
      score += record.importance * 0.5;
      const ageMs = Date.now() - new Date(record.createdAt).getTime();
      score += Math.max(0, 1 - ageMs / (7 * 24 * 60 * 60 * 1000));
      return { record, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, limit).map((s) => {
      s.record.lastAccessedAt = new Date().toISOString();
      s.record.accessCount++;
      return s.record;
    });
    return results;
  }

  recordDecision(decision: Omit<DecisionRecord, 'id' | 'createdAt'>): DecisionRecord {
    const id = `dec-${++decIdCounter}`;
    const full: DecisionRecord = {
      ...decision,
      id,
      createdAt: new Date().toISOString(),
    };
    this.decisions.push(full);
    return full;
  }

  getDecisionHistory(agentId: string): DecisionRecord[] {
    return this.decisions.filter((d) => d.agentId === agentId);
  }

  summarize(agentId: string): MemorySummary {
    const agentMemories = Array.from(this.memories.values()).filter((m) => m.agentId === agentId);
    const agentDecisions = this.decisions.filter((d) => d.agentId === agentId);

    const entityIds = new Set<string>();
    for (const mem of agentMemories) {
      if (Array.isArray(mem.content)) {
        for (const item of mem.content) {
          if (typeof item === 'string') entityIds.add(item);
        }
      }
    }
    for (const dec of agentDecisions) {
      for (const eid of dec.relatedEntityIds) entityIds.add(eid);
    }

    const decisionCount = agentDecisions.length;
    const successCount = agentDecisions.filter((d) => d.outcome === 'success').length;
    const avgConfidence = agentDecisions.length > 0
      ? agentDecisions.reduce((s, d) => s + d.confidence, 0) / agentDecisions.length
      : 0;

    const summary: MemorySummary = {
      id: `sum-${++sumIdCounter}`,
      agentId,
      summary: `Agent '${agentId}' has ${agentMemories.length} memory records and ${decisionCount} decisions (${successCount} successful, avg confidence: ${avgConfidence.toFixed(2)}). Related to ${entityIds.size} entities.`,
      entityIds: Array.from(entityIds),
      createdAt: new Date().toISOString(),
      organizationId: agentMemories[0]?.organizationId ?? '',
    };

    if (!this.summaries.has(agentId)) this.summaries.set(agentId, []);
    this.summaries.get(agentId)!.push(summary);

    return summary;
  }

  forget(key: string, agentId: string): boolean {
    return this.memories.delete(this.key(key, agentId));
  }

  clear(organizationId: string): void {
    for (const [k, record] of this.memories) {
      if (record.organizationId === organizationId) {
        this.memories.delete(k);
      }
    }
    const decIdx = this.decisions.findIndex((d) => d.organizationId === organizationId);
    if (decIdx !== -1) {
      this.decisions.splice(decIdx);
    }
    for (const [agentId, summaries] of this.summaries) {
      this.summaries.set(agentId, summaries.filter((s) => s.organizationId !== organizationId));
    }
  }

  getMemoryCount(): number {
    return this.memories.size;
  }

  getDecisionCount(): number {
    return this.decisions.length;
  }

  private key(key: string, agentId: string): string {
    return `${agentId}:${key}`;
  }
}
