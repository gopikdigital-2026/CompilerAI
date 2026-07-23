import type { Workflow } from '../models/WorkflowDefinition';
import type { WorkflowValidator } from '../designer/WorkflowValidator';
import type { IIdentityAdapter } from '../integrations/IntegrationAdapters';
import type { ChangeHistoryEntry } from '../models/CollaborationModels';
import type { IChangeHistoryRepository } from '../repositories/RepositoryInterfaces';
import { AuthorizationError } from '../errors/AutomationStudioErrors';

export interface SecurityContext {
  userId: string;
  organizationId: string;
  roleNames: string[];
}

const PERMISSION_MAP: Record<string, string> = {
  'workflow:create': 'workflows:write',
  'workflow:read': 'workflows:read',
  'workflow:update': 'workflows:write',
  'workflow:delete': 'workflows:delete',
  'workflow:publish': 'workflows:publish',
  'workflow:simulate': 'workflows:read',
  'workflow:export': 'workflows:read',
  'workflow:import': 'workflows:write',
  'workflow:clone': 'workflows:read',
  'workflow:rollback': 'workflows:publish',
  'review:request': 'workflows:review',
  'review:complete': 'workflows:review',
  'comment:add': 'workflows:comment',
  'monitor:view': 'workflows:read',
};

export class SecurityService {
  constructor(
    private readonly identityAdapter: IIdentityAdapter,
    private readonly validator: WorkflowValidator,
    private readonly changeHistoryRepo: IChangeHistoryRepository,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async checkPermission(ctx: SecurityContext, action: string): Promise<boolean> {
    const permission = PERMISSION_MAP[action];
    if (!permission) return false;
    return this.identityAdapter.checkPermission(ctx.userId, ctx.organizationId, permission);
  }

  async assertPermission(ctx: SecurityContext, action: string): Promise<void> {
    const allowed = await this.checkPermission(ctx, action);
    if (!allowed) {
      throw new AuthorizationError(`User ${ctx.userId} is not authorized for action: ${action}`);
    }
  }

  async assertSameOrganization(ctx: SecurityContext, targetOrgId: string): Promise<void> {
    if (ctx.organizationId !== targetOrgId) {
      await this.identityAdapter.assertSameOrganization(ctx.organizationId, targetOrgId);
    }
  }

  validateBeforePublish(workflow: Workflow): { valid: boolean; errors: string[] } {
    const result = this.validator.validate(workflow);
    return { valid: result.valid, errors: result.errors };
  }

  async assertCanPublish(ctx: SecurityContext, workflow: Workflow): Promise<void> {
    await this.assertPermission(ctx, 'workflow:publish');
    await this.assertSameOrganization(ctx, workflow.organizationId);
    const validation = this.validateBeforePublish(workflow);
    if (!validation.valid) {
      throw new AuthorizationError(`Workflow fails validation: ${validation.errors.join('; ')}`);
    }
  }

  async assertCanRollback(ctx: SecurityContext, workflow: Workflow): Promise<void> {
    await this.assertPermission(ctx, 'workflow:rollback');
    await this.assertSameOrganization(ctx, workflow.organizationId);
  }

  async auditChange(
    ctx: SecurityContext,
    workflowId: string,
    action: ChangeHistoryEntry['action'],
    description: string,
    detail?: { nodeId?: string | null; previousValue?: unknown; newValue?: unknown },
  ): Promise<ChangeHistoryEntry> {
    const now = this.clock();
    const entry: ChangeHistoryEntry = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: ctx.organizationId,
      workflowId,
      action,
      actorId: ctx.userId,
      actorName: ctx.roleNames.join(', ') || ctx.userId,
      description,
      nodeId: detail?.nodeId ?? null,
      previousValue: detail?.previousValue ?? null,
      newValue: detail?.newValue ?? null,
    };
    return this.changeHistoryRepo.create(entry);
  }

  getPermissionMap(): Record<string, string> {
    return { ...PERMISSION_MAP };
  }
}
