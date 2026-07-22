// ─── Identity policies ──────────────────────────────────────────────────────────
// Security policies for the identity layer.

import type { AuthenticatedPrincipal } from '../auth/AuthInterfaces';
import type { PolicyContext, PolicyDecision } from '../authorization/AuthorizationInterfaces';
import { isPlatformAdminRole, isOrgAdminRole } from '../roles/Roles';

export class OrganizationPolicyEvaluator {
  evaluate(principal: AuthenticatedPrincipal, context: PolicyContext): PolicyDecision {
    if (context.resourceOrgId && principal.organizationId !== context.resourceOrgId) {
      if (!principal.roles.some(r => isPlatformAdminRole(r))) {
        return { allowed: false, reason: 'Cross-organization access denied', code: 'CROSS_ORG' };
      }
    }
    return { allowed: true };
  }
}

export class PrivilegeEscalationPolicyEvaluator {
  evaluate(
    assignerRoles: string[],
    targetRole: string,
  ): PolicyDecision {
    if (targetRole === 'PLATFORM_ADMIN' && !assignerRoles.includes('PLATFORM_ADMIN')) {
      return { allowed: false, reason: 'Only PLATFORM_ADMIN can assign PLATFORM_ADMIN role', code: 'PRIVILEGE_ESCALATION' };
    }
    if (!assignerRoles.some(r => isOrgAdminRole(r))) {
      return { allowed: false, reason: 'Only admins can assign roles', code: 'NOT_ADMIN' };
    }
    return { allowed: true };
  }
}

export class SuspendedOrganizationPolicyEvaluator {
  evaluate(principal: AuthenticatedPrincipal, _context: PolicyContext): PolicyDecision {
    if (!principal.roles.some(r => isPlatformAdminRole(r))) {
      return { allowed: true };
    }
    return { allowed: true };
  }
}
