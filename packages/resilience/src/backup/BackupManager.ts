import type {
  BackupSnapshot,
  BackupType,
  IBackupManager,
  RestoreResult,
} from '../models.js';

let snapshotCounter = 0;

function computeChecksum(data: Record<string, unknown>): string {
  const json = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    const char = json.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `sha256-${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

function dataSize(data: Record<string, unknown>): number {
  return JSON.stringify(data).length;
}

export class BackupManager implements IBackupManager {
  private readonly snapshots = new Map<string, BackupSnapshot>();

  createBackup(
    target: BackupSnapshot['target'],
    data: Record<string, unknown>,
    options?: { type?: BackupType; parentId?: string },
  ): BackupSnapshot {
    const type = options?.type ?? 'full';
    const id = `snap-${(++snapshotCounter).toString(36)}`;
    const checksum = computeChecksum(data);

    let actualData = data;
    let sizeBytes = dataSize(data);

    if (type === 'incremental' && options?.parentId) {
      const parent = this.snapshots.get(options.parentId);
      if (parent) {
        actualData = {};
        for (const [key, value] of Object.entries(data)) {
          const parentValue = parent.data[key];
          if (JSON.stringify(parentValue) !== JSON.stringify(value)) {
            actualData[key] = value;
          }
        }
        sizeBytes = dataSize(actualData);
      }
    }

    const snapshot: BackupSnapshot = {
      id,
      type,
      target,
      status: 'completed',
      sizeBytes,
      checksum,
      createdAt: new Date().toISOString(),
      parentId: options?.parentId,
      data: actualData,
      validated: false,
    };

    snapshot.validated = this.validateSnapshotIntegrity(snapshot);
    this.snapshots.set(id, snapshot);
    return snapshot;
  }

  restoreBackup(snapshotId: string, options?: { selectiveKeys?: string[] }): RestoreResult {
    const start = Date.now();
    const snapshot = this.snapshots.get(snapshotId);

    if (!snapshot) {
      return {
        snapshotId,
        success: false,
        recordsRestored: 0,
        integrityValid: false,
        durationMs: 0,
        errors: [`Snapshot '${snapshotId}' not found`],
        timestamp: new Date().toISOString(),
      };
    }

    if (snapshot.status !== 'completed') {
      return {
        snapshotId,
        success: false,
        recordsRestored: 0,
        integrityValid: false,
        durationMs: 0,
        errors: [`Snapshot '${snapshotId}' is not completed (status: ${snapshot.status})`],
        timestamp: new Date().toISOString(),
      };
    }

    const errors: string[] = [];
    let dataToRestore = snapshot.data;

    // For incremental, merge with parent chain
    if (snapshot.type === 'incremental' && snapshot.parentId) {
      const chain = this.getParentChain(snapshot);
      if (chain.length > 0) {
        const merged: Record<string, unknown> = {};
        for (const s of chain) {
          Object.assign(merged, s.data);
        }
        Object.assign(merged, snapshot.data);
        dataToRestore = merged;
      }
    }

    // Selective restore
    if (options?.selectiveKeys && options.selectiveKeys.length > 0) {
      const filtered: Record<string, unknown> = {};
      for (const key of options.selectiveKeys) {
        if (key in dataToRestore) {
          filtered[key] = dataToRestore[key];
        } else {
          errors.push(`Key '${key}' not found in snapshot`);
        }
      }
      dataToRestore = filtered;
    }

    const integrityValid = this.validateSnapshotIntegrity(snapshot);
    if (!integrityValid) {
      errors.push('Integrity check failed');
    }

    const recordsRestored = Object.keys(dataToRestore).length;

    return {
      snapshotId,
      success: errors.length === 0,
      recordsRestored,
      integrityValid,
      durationMs: Date.now() - start,
      errors,
      timestamp: new Date().toISOString(),
    };
  }

  validateIntegrity(snapshotId: string): boolean {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) return false;
    return this.validateSnapshotIntegrity(snapshot);
  }

  private validateSnapshotIntegrity(snapshot: BackupSnapshot): boolean {
    const computed = computeChecksum(snapshot.data);
    return computed === snapshot.checksum;
  }

  private getParentChain(snapshot: BackupSnapshot): BackupSnapshot[] {
    const chain: BackupSnapshot[] = [];
    let current = snapshot;
    while (current.parentId) {
      const parent = this.snapshots.get(current.parentId);
      if (!parent) break;
      chain.unshift(parent);
      current = parent;
    }
    return chain;
  }

  getSnapshots(): BackupSnapshot[] {
    return Array.from(this.snapshots.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  getSnapshot(id: string): BackupSnapshot | undefined {
    return this.snapshots.get(id);
  }

  deleteSnapshot(id: string): boolean {
    return this.snapshots.delete(id);
  }

  count(): number {
    return this.snapshots.size;
  }

  countByType(type: BackupType): number {
    return this.getSnapshots().filter((s) => s.type === type).length;
  }
}
