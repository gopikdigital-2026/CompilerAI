// ─── Authorization interfaces ───────────────────────────────────────────────────

import type { AuthenticatedPrincipal } from '../auth/AuthInterfaces';

export interface IRolePermissionResolver {
  resolvePermissions(actorId: string, organizationId: string): Promise<string[]>;
  resolveRoles(actorId: string, organizationId: string): Promise<string[]>;
}

export interface IAuthorizationService {
  checkAccess(principal: AuthenticatedPrincipal, requiredPermission: string, resourceOrgId?: string): Promise<boolean>;
  checkAccessAll(principal: AuthenticatedPrincipal, requiredPermissions: string[], resourceOrgId?: string): Promise<boolean>;
  assertAccess(principal: AuthenticatedPrincipal, requiredPermission: string, resourceOrgId?: string): Promise<void>;
}

export interface IPolicyEvaluator {
  evaluate(principal: AuthenticatedPrincipal, permission: string, context: PolicyContext): Promise<PolicyDecision>;
}

export interface IResourcePermissionChecker {
  checkResourceOwnership(principal: AuthenticatedPrincipal, resourceOrgId: string): boolean;
  checkResourceAccess(principal: AuthenticatedPrincipal, resourceOrgId: string, requiredPermission: string): Promise<boolean>;
}

export interface PolicyContext {
  resourceOrgId?:     string;
  resourceOwnerId?:   string;
  resourceType?:      string;
  resourceId?:        string;
  metadata?:          Record<string, unknown>;
}

export type PolicyDecision =
  | { allowed: true }
  | { allowed: false; reason: string; code: string };
