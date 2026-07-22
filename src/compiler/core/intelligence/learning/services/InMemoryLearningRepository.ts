// ─── InMemoryLearningRepository ─────────────────────────────────────────────────
// In-memory repository for learning records. Swappable for future DB adapters.

import type { LearningRecord } from '../models/LearningRecord';
import type { ILearningRepository } from '../interfaces/ILearningEngine';
import type { LearningStatus } from '../models/LearningTypes';

export class InMemoryLearningRepository implements ILearningRepository {
  private readonly store = new Map<string, LearningRecord>();
  private readonly orgIndex = new Map<string, Set<string>>();

  save(record: LearningRecord): void {
    this.store.set(record.recordId, record);
    if (!this.orgIndex.has(record.organizationId)) this.orgIndex.set(record.organizationId, new Set());
    this.orgIndex.get(record.organizationId)!.add(record.recordId);
  }

  findById(recordId: string): LearningRecord | null {
    return this.store.get(recordId) ?? null;
  }

  findByOrganization(organizationId: string): LearningRecord[] {
    const ids = this.orgIndex.get(organizationId);
    if (!ids) return [];
    return Array.from(ids).map(id => this.store.get(id)).filter((r): r is LearningRecord => r !== undefined);
  }

  findByStatus(organizationId: string, status: LearningStatus): LearningRecord[] {
    return this.findByOrganization(organizationId).filter(r => r.status === status);
  }

  findAll(): LearningRecord[] {
    return Array.from(this.store.values());
  }

  update(record: LearningRecord): boolean {
    if (!this.store.has(record.recordId)) return false;
    this.store.set(record.recordId, record);
    return true;
  }

  delete(recordId: string): boolean {
    const record = this.store.get(recordId);
    if (!record) return false;
    this.store.delete(recordId);
    this.orgIndex.get(record.organizationId)?.delete(recordId);
    return true;
  }

  count(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
    this.orgIndex.clear();
  }
}
