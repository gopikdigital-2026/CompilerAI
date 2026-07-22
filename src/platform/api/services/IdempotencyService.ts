// ─── Idempotency repository and service ─────────────────────────────────────────

export interface IdempotencyRecord {
  organizationId: string;
  idempotencyKey: string;
  requestHash:    string;
  response:       unknown;
  statusCode:     number;
  createdAt:      string;
  expiresAt:      string | null;
}

export interface IIdempotencyRepository {
  save(record: IdempotencyRecord): void;
  findByKey(organizationId: string, key: string): IdempotencyRecord | null;
  delete(record: IdempotencyRecord): void;
  clear(): void;
}

export class InMemoryIdempotencyRepository implements IIdempotencyRepository {
  private readonly store = new Map<string, IdempotencyRecord>();
  private readonly now: () => number;

  constructor(now?: () => number) {
    this.now = now ?? (() => Date.now());
  }

  private key(orgId: string, idemKey: string): string {
    return `${orgId}:${idemKey}`;
  }

  save(record: IdempotencyRecord): void {
    this.store.set(this.key(record.organizationId, record.idempotencyKey), record);
  }

  findByKey(organizationId: string, idemKey: string): IdempotencyRecord | null {
    const record = this.store.get(this.key(organizationId, idemKey));
    if (!record) return null;
    if (record.expiresAt && new Date(record.expiresAt).getTime() < this.now()) {
      this.store.delete(this.key(organizationId, idemKey));
      return null;
    }
    return record;
  }

  delete(record: IdempotencyRecord): void {
    this.store.delete(this.key(record.organizationId, record.idempotencyKey));
  }

  clear(): void { this.store.clear(); }
}

export class IdempotencyService {
  private readonly repository: IIdempotencyRepository;
  private readonly clock: () => string;

  constructor(repository: IIdempotencyRepository, clock: () => string) {
    this.repository = repository;
    this.clock = clock;
  }

  checkOrStore(
    organizationId: string,
    idempotencyKey: string,
    requestHash: string,
  ): { duplicate: boolean; record: IdempotencyRecord | null } {
    const existing = this.repository.findByKey(organizationId, idempotencyKey);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return { duplicate: true, record: existing }; // conflict — different body
      }
      return { duplicate: true, record: existing }; // same body — return cached
    }
    return { duplicate: false, record: null };
  }

  store(
    organizationId: string,
    idempotencyKey: string,
    requestHash: string,
    response: unknown,
    statusCode: number,
    ttlMs: number = 86_400_000,
  ): void {
    const now = this.clock();
    const expiresAt = new Date(new Date(now).getTime() + ttlMs).toISOString();
    this.repository.save({
      organizationId, idempotencyKey, requestHash, response, statusCode,
      createdAt: now, expiresAt,
    });
  }

  computeRequestHash(body: unknown): string {
    const json = JSON.stringify(body);
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `reqhash:${Math.abs(hash).toString(16)}`;
  }
}
