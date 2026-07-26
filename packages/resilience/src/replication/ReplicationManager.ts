import type {
  ConflictRecord,
  IReplicationManager,
  ReplicaNode,
  ReplicationResult,
  ReplicationStatus,
  ReplicationTarget,
} from '../models.js';

let conflictCounter = 0;

export class ReplicationManager implements IReplicationManager {
  private readonly nodes = new Map<string, ReplicaNode>();
  private readonly conflicts: ConflictRecord[] = [];
  private readonly stores = new Map<ReplicationTarget, Record<string, unknown>>();

  registerNode(node: ReplicaNode): void {
    this.nodes.set(node.id, { ...node });
    if (!this.stores.has(node.target)) {
      this.stores.set(node.target, {});
    }
  }

  unregisterNode(nodeId: string): boolean {
    return this.nodes.delete(nodeId);
  }

  replicate(target: ReplicationTarget, data: Record<string, unknown>): ReplicationResult {
    const start = Date.now();
    const targetNodes = this.getNodes(target);
    let recordsSynced = 0;
    const detectedConflicts: ConflictRecord[] = [];

    for (const node of targetNodes) {
      node.status = 'syncing';
    }

    const store = this.stores.get(target) ?? {};
    for (const [key, value] of Object.entries(data)) {
      if (key in store) {
        const existingValue = store[key];
        if (JSON.stringify(existingValue) !== JSON.stringify(value)) {
          const conflict: ConflictRecord = {
            id: `conflict-${(++conflictCounter).toString(36)}`,
            target,
            key,
            sourceValue: value,
            targetValue: existingValue,
            detectedAt: new Date().toISOString(),
          };
          detectedConflicts.push(conflict);
          this.conflicts.push(conflict);
          continue;
        }
      }
      store[key] = value;
      recordsSynced++;
    }

    this.stores.set(target, store);

    for (const node of targetNodes) {
      node.status = detectedConflicts.length > 0 ? 'conflict' : 'synced';
      node.lastSyncAt = new Date().toISOString();
      node.lag = 0;
    }

    return {
      target,
      success: detectedConflicts.length === 0,
      recordsSynced,
      conflicts: detectedConflicts,
      durationMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    };
  }

  detectConflicts(
    target: ReplicationTarget,
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>,
  ): ConflictRecord[] {
    const detected: ConflictRecord[] = [];

    for (const [key, sourceValue] of Object.entries(sourceData)) {
      if (key in targetData) {
        const targetValue = targetData[key];
        if (JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
          const conflict: ConflictRecord = {
            id: `conflict-${(++conflictCounter).toString(36)}`,
            target,
            key,
            sourceValue,
            targetValue,
            detectedAt: new Date().toISOString(),
          };
          detected.push(conflict);
          this.conflicts.push(conflict);
        }
      }
    }

    return detected;
  }

  resolveConflict(conflictId: string, strategy: ConflictRecord['resolutionStrategy']): boolean {
    const conflict = this.conflicts.find((c) => c.id === conflictId);
    if (!conflict || !strategy) return false;

    const store = this.stores.get(conflict.target);
    if (!store) return false;

    switch (strategy) {
      case 'source_wins':
        store[conflict.key] = conflict.sourceValue;
        break;
      case 'target_wins':
        // keep existing
        break;
      case 'merge':
        if (typeof conflict.sourceValue === 'object' && conflict.sourceValue !== null) {
          store[conflict.key] = {
            ...(store[conflict.key] as object),
            ...(conflict.sourceValue as object),
          };
        } else {
          store[conflict.key] = conflict.sourceValue;
        }
        break;
      case 'manual':
        // no automatic action
        break;
    }

    const idx = this.conflicts.indexOf(conflict);
    if (idx >= 0) this.conflicts.splice(idx, 1);
    return true;
  }

  getNodes(target?: ReplicationTarget): ReplicaNode[] {
    let nodes = Array.from(this.nodes.values());
    if (target) {
      nodes = nodes.filter((n) => n.target === target);
    }
    return nodes;
  }

  getConflicts(): ConflictRecord[] {
    return [...this.conflicts];
  }

  getStore(target: ReplicationTarget): Record<string, unknown> {
    return { ...(this.stores.get(target) ?? {}) };
  }

  countNodes(): number {
    return this.nodes.size;
  }

  setStatus(nodeId: string, status: ReplicationStatus): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.status = status;
    }
  }
}

export function createReplicaNode(id: string, target: ReplicationTarget, endpoint: string): ReplicaNode {
  return {
    id,
    target,
    endpoint,
    status: 'synced',
    lastSyncAt: new Date().toISOString(),
    lag: 0,
  };
}
