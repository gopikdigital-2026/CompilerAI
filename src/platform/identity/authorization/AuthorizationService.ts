// ─── Authorization Service ──────────────────────────────────────────────────────
// Validates: organization membership, role, permissions, resource ownership, policies.

import type {
  IAuthorizationService, IRolePermissionResolver, IPolicyEvaluator, IResourcePermissionChecker,
  PolicyContext, PolicyDecision,
} from './AuthorizationInterfaces';
import type { AuthenticatedPrincipal } from '../auth/AuthInterfaces';
import { PermissionSet } from '../permissions/Permissions';
import { isPlatformAdminRole } from '../roles/Roles';
import {
  AuthorizationError, InsufficientPermissionsError, WrongOrganizationError, PrivilegeEscalationError,
} from '../errors/IdentityErrors';

export class AuthorizationService implements IAuthorizationService, IResourcePermissionChecker {
  private readonly policyEvaluator: IPolicyEvaluator | null;

  constructor(_rolePermissionResolver: IRolePermissionResolver, policyEvaluator: IPolicyEvaluator | null = null) {
    this.policyEvaluator = policyEvaluator;
  }

  async checkAccess(principal: AuthenticatedPrincipal, requiredPermission: string, resourceOrgId?: string): Promise<boolean> {
    if (this.checkResourceOwnership(principal, resourceOrgId ?? principal.organizationId) === false) return false;
    if (principal.roles.some(r => isPlatformAdminRole(r))) return true;
    const permSet = new PermissionSet(principal.permissions);
    if (permSet.has(requiredPermission)) {
      if (this.policyEvaluator) {
        const decision = await this.policyEvaluator.evaluate(principal, requiredPermission, { resourceOrgId });
        return decision.allowed;
      }
      return true;
    }
    return false;
  }

  async checkAccessAll(principal: AuthenticatedPrincipal, requiredPermissions: string[], resourceOrgId?: string): Promise<boolean> {
    for (const perm of requiredPermissions) {
      if (!(await this.checkAccess(principal, perm, resourceOrgId))) return false;
    }
    return true;
  }

  async assertAccess(principal: AuthenticatedPrincipal, requiredPermission: string, resourceOrgId?: string): Promise<void> {
    const orgId = resourceOrgId ?? principal.organizationId;
    if (!this.checkResourceOwnership(principal, orgId)) {
      throw new WrongOrganizationError();
    }
    if (principal.roles.some(r => isPlatformAdminRole(r))) return;
    const permSet = new PermissionSet(principal.permissions);
    if (!permSet.has(requiredPermission)) {
      throw new InsufficientPermissionsError([requiredPermission]);
    }
    if (this.policyEvaluator) {
      const decision = await this.policyEvaluator.evaluate(principal, requiredPermission, { resourceOrgId: orgId });
      if (!decision.allowed) {
        throw new AuthorizationError(decision.reason);
      }
    }
  }

  checkResourceOwnership(principal: AuthenticatedPrincipal, resourceOrgId: string): boolean {
    if (principal.roles.some(r => isPlatformAdminRole(r))) return true;
    return principal.organizationId === resourceOrgId;
  }

  async checkResourceAccess(principal: AuthenticatedPrincipal, resourceOrgId: string, requiredPermission: string): Promise<boolean> {
    return this.checkAccess(principal, requiredPermission, resourceOrgId);
  }
}

// ─── Policy Evaluator ────────────────────────────────────────────────────────────

export class DefaultPolicyEvaluator implements IPolicyEvaluator {
  async evaluate(principal: AuthenticatedPrincipal, _permission: string, context: PolicyContext): Promise<PolicyDecision> {
    if (context.resourceOrgId && principal.organizationId !== context.resourceOrgId) {
      if (!principal.roles.some(r => isPlatformAdminRole(r))) {
        return { allowed: false, reason: 'Resource belongs to a different organization', code: 'WRONG_ORG' };
      }
    }
    return { allowed: true };
  }
}

// ─── Privilege Escalation Guard ──────────────────────────────────────────────────

export class PrivilegeGuard {
  canAssignRole(assignerRoles: string[], targetRole: string): boolean {
    const assignerIsAdmin = assignerRoles.some(r => r === 'PLATFORM_ADMIN' || r === 'ORGANIZATION_ADMIN');
    if (!assignerIsAdmin) return false;
    if (targetRole === 'PLATFORM_ADMIN') {
      return assignerRoles.includes('PLATFORM_ADMIN');
    }
    return true;
  }

  assertCanAssignRole(assignerRoles: string[], targetRole: string): void {
    if (!this.canAssignRole(assignerRoles, targetRole)) {
      throw new PrivilegeEscalationError(`Cannot assign role ${targetRole} with roles ${assignerRoles.join(', ')}`);
    }
  }

  canManageUser(managerRoles: string[], targetUserRoles: string[]): boolean {
    const managerIsAdmin = managerRoles.some(r => r === 'PLATFORM_ADMIN' || r === 'ORGANIZATION_ADMIN');
    if (!managerIsAdmin) return false;
    if (targetUserRoles.includes('PLATFORM_ADMIN')) {
      return managerRoles.includes('PLATFORM_ADMIN');
    }
    return true;
  }
}
