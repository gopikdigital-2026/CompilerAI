// ─── Transactional Outbox pattern ───────────────────────────────────────────────
// Reliable event publishing: domain state + integration event in the same transaction.

import { OutboxPublishError } from '../errors/InfrastructureErrors';

export type OutboxStatus = 'PENDING' | 'PROCESSING' | 'PUBLISHED' | 'FAILED' | 'DEAD_LETTER';

export interface OutboxEvent {
  id:              string;
  organizationId:  string;
  eventType:       string;
  aggregateId:     string;
  payload:         Record<string, unknown>;
  status:          OutboxStatus;
  retryCount:      number;
  maxRetries:      number;
  nextAttemptAt:   string;
  lastError:       string | null;
  publishedAt:     string | null;
  createdAt:       string;
  updatedAt:       string;
}

export interface IOutboxRepository {
  save(event: OutboxEvent): Promise<void>;
  findById(eventId: string): Promise<OutboxEvent | null>;
  findPending(limit: number): Promise<OutboxEvent[]>;
  update(event: OutboxEvent): Promise<void>;
  findByOrganization(organizationId: string): Promise<OutboxEvent[]>;
  countByStatus(status: OutboxStatus): Promise<number>;
  clear(): Promise<void>;
}

export class InMemoryOutboxRepository implements IOutboxRepository {
  private readonly events = new Map<string, OutboxEvent>();
  private readonly clock: () => string;

  constructor(clock: () => string) {
    this.clock = clock;
  }

  async save(event: OutboxEvent): Promise<void> {
    this.events.set(event.id, { ...event });
  }

  async findById(eventId: string): Promise<OutboxEvent | null> {
    return this.events.get(eventId) ?? null;
  }

  async findPending(limit: number): Promise<OutboxEvent[]> {
    const now = this.clock();
    return Array.from(this.events.values())
      .filter(e => (e.status === 'PENDING' || e.status === 'PROCESSING') && e.nextAttemptAt <= now)
      .slice(0, limit);
  }

  async update(event: OutboxEvent): Promise<void> {
    this.events.set(event.id, { ...event, updatedAt: this.clock() });
  }

  async findByOrganization(organizationId: string): Promise<OutboxEvent[]> {
    return Array.from(this.events.values()).filter(e => e.organizationId === organizationId);
  }

  async countByStatus(status: OutboxStatus): Promise<number> {
    return Array.from(this.events.values()).filter(e => e.status === status).length;
  }

  async clear(): Promise<void> {
    this.events.clear();
  }
}

// ── Outbox publisher ────────────────────────────────────────────────────────────

export interface IOutboxHandler {
  publish(event: OutboxEvent): Promise<void>;
}

export class OutboxPublisher {
  private readonly repository: IOutboxRepository;
  private readonly handler: IOutboxHandler;
  private readonly clock: () => string;
  private readonly idGenerator: () => string;
  private readonly maxRetries: number;
  private readonly backoffMs: number;
  private readonly backoffMultiplier: number;

  constructor(
    repository: IOutboxRepository,
    handler: IOutboxHandler,
    clock: () => string,
    idGenerator: () => string,
    maxRetries = 5,
    backoffMs = 1000,
    backoffMultiplier = 2,
  ) {
    this.repository = repository;
    this.handler = handler;
    this.clock = clock;
    this.idGenerator = idGenerator;
    this.maxRetries = maxRetries;
    this.backoffMs = backoffMs;
    this.backoffMultiplier = backoffMultiplier;
  }

  async createEvent(
    organizationId: string,
    eventType: string,
    aggregateId: string,
    payload: Record<string, unknown>,
  ): Promise<OutboxEvent> {
    const event: OutboxEvent = {
      id: this.idGenerator(),
      organizationId,
      eventType,
      aggregateId,
      payload,
      status: 'PENDING',
      retryCount: 0,
      maxRetries: this.maxRetries,
      nextAttemptAt: this.clock(),
      lastError: null,
      publishedAt: null,
      createdAt: this.clock(),
      updatedAt: this.clock(),
    };
    await this.repository.save(event);
    return event;
  }

  async processBatch(limit = 10): Promise<{ processed: number; published: number; failed: number }> {
    const pending = await this.repository.findPending(limit);
    let published = 0;
    let failed = 0;

    for (const event of pending) {
      event.status = 'PROCESSING';
      await this.repository.update(event);

      try {
        await this.handler.publish(event);
        event.status = 'PUBLISHED';
        event.publishedAt = this.clock();
        event.lastError = null;
        published++;
      } catch (err) {
        event.retryCount++;
        event.lastError = err instanceof Error ? err.message : String(err);

        if (event.retryCount >= event.maxRetries) {
          event.status = 'DEAD_LETTER';
        } else {
          event.status = 'FAILED';
          const delay = this.backoffMs * Math.pow(this.backoffMultiplier, event.retryCount - 1);
          event.nextAttemptAt = new Date(new Date(this.clock()).getTime() + delay).toISOString();
        }
        failed++;
      }

      await this.repository.update(event);
    }

    return { processed: pending.length, published, failed };
  }
}

// ── Outbox processor (periodic runner) ──────────────────────────────────────────

export class OutboxProcessor {
  private readonly publisher: OutboxPublisher;
  private readonly pollIntervalMs: number;
  private readonly batchSize: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(publisher: OutboxPublisher, pollIntervalMs = 5000, batchSize = 10) {
    this.publisher = publisher;
    this.pollIntervalMs = pollIntervalMs;
    this.batchSize = batchSize;
  }

  start(): void {
    if (this.timer) return;
    this.running = true;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<{ processed: number; published: number; failed: number }> {
    if (!this.running) return { processed: 0, published: 0, failed: 0 };
    return this.publisher.processBatch(this.batchSize);
  }
}

// ── Simulated outbox handler ────────────────────────────────────────────────────

export class SimulatedOutboxHandler implements IOutboxHandler {
  private readonly published: OutboxEvent[] = [];
  private failNext = false;

  failNextPublish(): void { this.failNext = true; }

  async publish(event: OutboxEvent): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new OutboxPublishError(event.id, 'Simulated publish failure');
    }
    this.published.push(event);
  }

  getPublished(): OutboxEvent[] { return [...this.published]; }
}
