import type {
  IQueueRecovery,
  QueueItem,
  QueueItemType,
  QueueRecoveryResult,
} from '../models.js';

let itemCounter = 0;

export class QueueRecovery implements IQueueRecovery {
  private readonly items: QueueItem[] = [];
  private readonly processedKeys = new Set<string>();

  enqueue(item: Omit<QueueItem, 'id' | 'status' | 'attempts' | 'createdAt'>): QueueItem {
    // Idempotency check — skip if already processed or already pending
    if (this.processedKeys.has(item.idempotencyKey) || this.items.some((i) => i.idempotencyKey === item.idempotencyKey && i.status === 'pending')) {
      return {
        ...item,
        id: `item-${(++itemCounter).toString(36)}`,
        status: 'completed',
        attempts: 0,
        createdAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      };
    }

    const full: QueueItem = {
      ...item,
      id: `item-${(++itemCounter).toString(36)}`,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    this.items.push(full);
    return full;
  }

  async recover(processor: (item: QueueItem) => Promise<boolean>): Promise<QueueRecoveryResult> {
    const start = Date.now();
    const pending = this.getPending();
    let recovered = 0;
    let failed = 0;
    const skipped = 0;
    let duplicateSuppressed = 0;

    for (const item of pending) {
      // Idempotency: skip if already processed
      if (this.processedKeys.has(item.idempotencyKey)) {
        duplicateSuppressed++;
        item.status = 'completed';
        continue;
      }

      item.status = 'processing';
      item.attempts++;

      try {
        const success = await processor(item);
        if (success) {
          item.status = 'completed';
          item.processedAt = new Date().toISOString();
          this.processedKeys.add(item.idempotencyKey);
          recovered++;
        } else {
          item.status = 'pending';
          failed++;
        }
      } catch {
        item.status = 'pending';
        failed++;
      }
    }

    return {
      totalItems: pending.length,
      recovered,
      failed,
      skipped,
      duplicateSuppressed,
      durationMs: Date.now() - start,
    };
  }

  getPending(): QueueItem[] {
    return this.items.filter((i) => i.status === 'pending');
  }

  getAll(): QueueItem[] {
    return [...this.items];
  }

  markCompleted(itemId: string): void {
    const item = this.items.find((i) => i.id === itemId);
    if (item) {
      item.status = 'completed';
      item.processedAt = new Date().toISOString();
      this.processedKeys.add(item.idempotencyKey);
    }
  }

  markFailed(itemId: string): void {
    const item = this.items.find((i) => i.id === itemId);
    if (item) {
      item.status = 'failed';
    }
  }

  count(): number {
    return this.items.length;
  }

  countByStatus(status: QueueItem['status']): number {
    return this.items.filter((i) => i.status === status).length;
  }

  countByType(type: QueueItemType): number {
    return this.items.filter((i) => i.type === type).length;
  }

  clear(): void {
    this.items.length = 0;
    this.processedKeys.clear();
  }
}
