import { PermissionSet } from '../permissions/PermissionModels';
import type { RoleService } from '../roles/RoleService';
import type { PolicyEngine } from '../policies/PolicyEngine';
import type { User } from '../users/UserModels';
import { AuthorizationError, PrivilegeEscalationError, CrossTenantError } from '../adapters/IdentityErrors';

export interface AuthContext {
  userId: string;
  organizationId: string;
  roleNames: string[];
  permissionIds: string[];
  authMethod: string;
}

export class AuthorizationService {
  constructor(
    private readonly roleService: RoleService,
    private readonly policyEngine: PolicyEngine,
  ) {}

  async buildContext(user: User): Promise<AuthContext> {
    const permissionIds = await this.roleService.getPermissionIds(user.roleIds);
    const roles = await Promise.all(
      user.roleIds.map((rid) => this.roleService.findById(rid).catch(() => null)),
    );
    const roleNames = roles.filter((r): r is NonNullable<typeof r> => r !== null).map((r) => r.name);
    return {
      userId: user.id,
      organizationId: user.organizationId,
      roleNames,
      permissionIds,
      authMethod: 'SESSION',
    };
  }

  async checkPermission(
    ctx: AuthContext,
    permission: string,
    resourceOrgId?: string,
  ): Promise<boolean> {
    if (resourceOrgId && resourceOrgId !== ctx.organizationId) {
      if (!ctx.roleNames.includes('PlatformAdmin')) {
        throw new CrossTenantError(
          `User ${ctx.userId} (org: ${ctx.organizationId}) cannot access resource in org ${resourceOrgId}`,
        );
      }
    }

    if (ctx.roleNames.includes('PlatformAdmin')) return true;

    const permSet = new PermissionSet(ctx.permissionIds);
    if (permSet.has(permission)) {
      const decision = await this.policyEngine.evaluate(ctx.organizationId, permission, {
        userId: ctx.userId,
        roleNames: ctx.roleNames,
      });
      return decision.allowed;
    }

    return false;
  }

  async assertPermission(
    ctx: AuthContext,
    permission: string,
    resourceOrgId?: string,
  ): Promise<void> {
    const allowed = await this.checkPermission(ctx, permission, resourceOrgId);
    if (!allowed) {
      throw new AuthorizationError(
        `User ${ctx.userId} does not have permission: ${permission}`,
      );
    }
  }

  async assertCanAssignRole(
    assignerCtx: AuthContext,
    targetRoleName: string,
  ): Promise<void> {
    if (targetRoleName === 'PlatformAdmin' && !assignerCtx.roleNames.includes('PlatformAdmin')) {
      throw new PrivilegeEscalationError('Only PlatformAdmin can assign PlatformAdmin role');
    }
    if (targetRoleName === 'OrganizationAdmin' &&
        !assignerCtx.roleNames.includes('PlatformAdmin') &&
        !assignerCtx.roleNames.includes('OrganizationAdmin')) {
      throw new PrivilegeEscalationError('Only PlatformAdmin or OrganizationAdmin can assign OrganizationAdmin role');
    }
  }

  async assertSameOrganization(ctx: AuthContext, targetOrgId: string): Promise<void> {
    if (ctx.organizationId !== targetOrgId && !ctx.roleNames.includes('PlatformAdmin')) {
      throw new CrossTenantError(
        `Cross-tenant access denied: user org ${ctx.organizationId} ≠ target org ${targetOrgId}`,
      );
    }
  }
}
