import type { AuditEntry, AuditAction, AuditSeverity } from './AuditModels';
import { sanitizeAuditDetail } from './AuditModels';
import type { IAuditRepository } from '../repositories/RepositoryInterfaces';
import type { PaginatedResult, PageQuery } from '../types/shared';

export interface CreateAuditEntryRequest {
  organizationId: string;
  action: AuditAction;
  actorId: string;
  actorType: 'USER' | 'API_KEY' | 'SERVICE_ACCOUNT' | 'SYSTEM';
  targetType: string;
  targetId: string;
  severity?: AuditSeverity;
  ipAddress?: string;
  detail?: Record<string, unknown>;
  success?: boolean;
}

export class AuditService {
  constructor(
    private readonly repo: IAuditRepository,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async record(request: CreateAuditEntryRequest): Promise<AuditEntry> {
    const now = this.clock();
    const entry: AuditEntry = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: request.organizationId,
      action: request.action,
      actorId: request.actorId,
      actorType: request.actorType,
      targetType: request.targetType,
      targetId: request.targetId,
      severity: request.severity ?? 'MEDIUM',
      ipAddress: request.ipAddress ?? null,
      detail: request.detail ? sanitizeAuditDetail(request.detail) : {},
      success: request.success ?? true,
    };
    return this.repo.create(entry);
  }

  async findByOrganization(organizationId: string, query?: PageQuery): Promise<PaginatedResult<AuditEntry>> {
    return this.repo.findByOrganization(organizationId, query);
  }

  async findByActor(actorId: string, organizationId: string): Promise<AuditEntry[]> {
    return this.repo.findByActor(actorId, organizationId);
  }

  async findByAction(action: string, organizationId: string): Promise<AuditEntry[]> {
    return this.repo.findByAction(action, organizationId);
  }
}
