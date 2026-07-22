// ─── Audit log ──────────────────────────────────────────────────────────────────
// Append-only audit trail. No updates or deletes.

export interface AuditLogEntry {
  auditLogId:    string;
  organizationId: string;
  actorId:       string;
  action:        string;
  resourceType:  string;
  resourceId:    string | null;
  result:        'SUCCESS' | 'FAILURE';
  correlationId: string | null;
  requestId:     string | null;
  metadata:      Record<string, unknown>;
  timestamp:     string;
}

export type AuditableAction =
  | 'workflow.create' | 'workflow.publish' | 'workflow.deactivate'
  | 'execution.create' | 'execution.pause' | 'execution.resume' | 'execution.cancel'
  | 'approval.approve' | 'approval.reject' | 'approval.request_changes'
  | 'api_key.create' | 'api_key.revoke'
  | 'permission.modify'
  | 'memory.delete'
  | 'admin.config_change';

export interface IAuditLogRepository {
  append(entry: AuditLogEntry): Promise<void>;
  findByOrganization(organizationId: string, limit: number, cursor?: string): Promise<{ entries: AuditLogEntry[]; nextCursor: string | null }>;
  findByActor(organizationId: string, actorId: string, limit: number): Promise<AuditLogEntry[]>;
  findByAction(organizationId: string, action: string, limit: number): Promise<AuditLogEntry[]>;
  count(): number;
  clear(): void;
}

// ── In-memory audit log ────────────────────────────────────────────────────────

export class InMemoryAuditLogRepository implements IAuditLogRepository {
  private readonly entries: AuditLogEntry[] = [];
  private readonly clock: () => string;

  constructor(_idGenerator: () => string, clock: () => string) {
    this.clock = clock;
  }

  async append(entry: AuditLogEntry): Promise<void> {
    this.entries.push({ ...entry, timestamp: this.clock() });
  }

  async findByOrganization(organizationId: string, limit: number, cursor?: string): Promise<{ entries: AuditLogEntry[]; nextCursor: string | null }> {
    let filtered = this.entries.filter(e => e.organizationId === organizationId);
    if (cursor) {
      const idx = filtered.findIndex(e => e.auditLogId === cursor);
      if (idx >= 0) filtered = filtered.slice(idx + 1);
    }
    const slice = filtered.slice(0, limit);
    const nextCursor = slice.length === limit && filtered.length > limit ? slice[slice.length - 1]?.auditLogId ?? null : null;
    return { entries: slice, nextCursor };
  }

  async findByActor(organizationId: string, actorId: string, limit: number): Promise<AuditLogEntry[]> {
    return this.entries.filter(e => e.organizationId === organizationId && e.actorId === actorId).slice(-limit).reverse();
  }

  async findByAction(organizationId: string, action: string, limit: number): Promise<AuditLogEntry[]> {
    return this.entries.filter(e => e.organizationId === organizationId && e.action === action).slice(-limit).reverse();
  }

  count(): number { return this.entries.length; }
  clear(): void { this.entries.length = 0; }
}

// ── Audit logger ────────────────────────────────────────────────────────────────

export class AuditLogger {
  private readonly repository: IAuditLogRepository;
  private readonly idGenerator: () => string;

  constructor(repository: IAuditLogRepository, idGenerator: () => string) {
    this.repository = repository;
    this.idGenerator = idGenerator;
  }

  async log(params: {
    organizationId: string;
    actorId: string;
    action: AuditableAction;
    resourceType: string;
    resourceId?: string;
    result?: 'SUCCESS' | 'FAILURE';
    correlationId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const entry: AuditLogEntry = {
      auditLogId: this.idGenerator(),
      organizationId: params.organizationId,
      actorId: params.actorId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId ?? null,
      result: params.result ?? 'SUCCESS',
      correlationId: params.correlationId ?? null,
      requestId: params.requestId ?? null,
      metadata: params.metadata ?? {},
      timestamp: new Date().toISOString(),
    };
    await this.repository.append(entry);
  }
}
