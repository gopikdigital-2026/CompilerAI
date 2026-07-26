import type {
  AuthorizationDecision,
  AuthorizationRequest,
  PermissionAction,
  ResourceCategory,
} from '../models.js';
import { hasRolePermission } from '../roles/RoleDefinitions.js';
import type { PolicyEngine } from '../policies/PolicyEngine.js';

export class AuthorizationEngine {
  private readonly policyEngine: PolicyEngine;

  constructor(policyEngine: PolicyEngine) {
    this.policyEngine = policyEngine;
  }

  authorize(request: AuthorizationRequest): AuthorizationDecision {
    const now = new Date().toISOString();

    // Step 1: Check RBAC — does any role grant this action?
    let rbacGranted = false;
    for (const role of request.roles) {
      if (hasRolePermission(role, request.resource, request.action)) {
        rbacGranted = true;
        break;
      }
    }

    // Step 2: Check ABAC — do context attributes allow this?
    if (request.abacContext) {
      const abacResult = this.evaluateABAC(request);
      if (abacResult.denied) {
        return {
          allowed: false,
          reason: abacResult.reason,
          matchedBy: 'abac',
          conditions: abacResult.conditions,
          evaluatedAt: now,
        };
      }
    }

    if (!rbacGranted) {
      return {
        allowed: false,
        reason: `No role grants ${request.action} on ${request.resource}`,
        matchedBy: 'denied',
        evaluatedAt: now,
      };
    }

    // Step 3: Check Policy Engine for additional restrictions
    const policyResult = this.policyEngine.evaluate({
      identityId: request.identityId,
      resource: request.resource,
      action: request.action,
      organizationId: request.organizationId,
      roles: request.roles,
      abacContext: request.abacContext,
    });

    if (policyResult.decision === 'deny') {
      return {
        allowed: false,
        reason: `Policy denied: ${policyResult.reason}`,
        matchedBy: 'policy',
        conditions: policyResult.matchedRules.map((r) => r.name),
        evaluatedAt: now,
      };
    }

    if (policyResult.decision === 'require_approval') {
      return {
        allowed: false,
        reason: `Policy requires approval: ${policyResult.reason}`,
        matchedBy: 'policy',
        conditions: ['requires_approval', ...policyResult.matchedRules.map((r) => r.name)],
        evaluatedAt: now,
      };
    }

    if (policyResult.decision === 'read_only' && request.action !== 'read') {
      return {
        allowed: false,
        reason: 'Policy restricts to read-only access',
        matchedBy: 'policy',
        conditions: ['read_only'],
        evaluatedAt: now,
      };
    }

    if (policyResult.decision === 'restricted') {
      return {
        allowed: true,
        reason: `Access granted with restrictions: ${policyResult.reason}`,
        matchedBy: 'policy',
        conditions: ['restricted', ...policyResult.matchedRules.map((r) => r.name)],
        evaluatedAt: now,
      };
    }

    return {
      allowed: true,
      reason: 'Access granted by RBAC',
      matchedBy: 'rbac',
      evaluatedAt: now,
    };
  }

  private evaluateABAC(request: AuthorizationRequest): { denied: boolean; reason: string; conditions: string[] } {
    const ctx = request.abacContext!;
    const conditions: string[] = [];

    // Check organization match
    if (ctx.organizationId !== request.organizationId) {
      return { denied: true, reason: 'Organization mismatch', conditions: ['org_mismatch'] };
    }

    // Check classification restrictions
    if (ctx.resourceClassification === 'restricted' && !request.roles.includes('owner') && !request.roles.includes('admin')) {
      return { denied: true, reason: 'Restricted resource requires owner or admin role', conditions: ['classification_restricted'] };
    }

    if (ctx.resourceClassification === 'confidential' && request.roles.length === 1 && request.roles[0] === 'viewer') {
      return { denied: true, reason: 'Confidential resource not accessible to viewers', conditions: ['classification_confidential'] };
    }

    // Check time-of-day restrictions (e.g., no write outside business hours for employees)
    if (ctx.timeOfDay && request.action === 'write') {
      const hour = parseInt(ctx.timeOfDay.split(':')[0], 10);
      if (hour < 8 || hour > 18) {
        if (!request.roles.includes('owner') && !request.roles.includes('admin')) {
          return { denied: true, reason: 'Write access not allowed outside business hours', conditions: ['time_restriction'] };
        }
      }
    }

    // Check day-of-week restrictions
    if (ctx.dayOfWeek && request.action !== 'read') {
      const weekend = ['Saturday', 'Sunday'];
      if (weekend.includes(ctx.dayOfWeek) && !request.roles.includes('owner') && !request.roles.includes('admin')) {
        return { denied: true, reason: 'Write access not allowed on weekends', conditions: ['weekend_restriction'] };
      }
    }

    // Check department tags
    if (ctx.tags && ctx.resourceTags) {
      const hasOverlap = ctx.tags.some((t) => ctx.resourceTags!.includes(t));
      if (!hasOverlap && request.action !== 'read') {
        conditions.push('department_tag_check_passed');
      }
    }

    return { denied: false, reason: 'ABAC checks passed', conditions };
  }

  checkAccess(
    resource: ResourceCategory,
    action: PermissionAction,
    roles: string[],
  ): boolean {
    return roles.some((role) => hasRolePermission(role as never, resource, action));
  }
}
