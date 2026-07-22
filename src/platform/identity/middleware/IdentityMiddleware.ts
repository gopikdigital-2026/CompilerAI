// ─── Identity middleware ────────────────────────────────────────────────────────
// Framework-agnostic middleware for the HTTP adapter pattern.

import type { AuthenticatedPrincipal, IAuthenticationProvider } from '../auth/AuthInterfaces';
import type { IAuthorizationService } from '../authorization/AuthorizationInterfaces';
import {
  AuthenticationError, AuthorizationError, InsufficientPermissionsError,
} from '../errors/IdentityErrors';
import { sanitizeLogMessage } from '../../../infrastructure/observability/InfrastructureMetrics';

export interface IdentityRequest {
  headers:   Record<string, string>;
  ip?:       string;
  userAgent?: string;
  path:      string;
  method:    string;
}

export interface IdentityContext {
  principal:     AuthenticatedPrincipal | null;
  requestId:     string;
  correlationId: string;
  startTime:     number;
}

export type IdentityMiddlewareResult =
  | { ok: true; context: IdentityContext }
  | { ok: false; status: number; error: string };

export class AuthenticationMiddleware {
  constructor(private authProvider: IAuthenticationProvider) {}

  async handle(req: IdentityRequest, requestId: string, correlationId: string): Promise<IdentityMiddlewareResult> {
    try {
      const principal = await this.authProvider.authenticate(req);
      if (!principal) {
        return { ok: false, status: 401, error: 'Authentication required' };
      }
      return {
        ok: true,
        context: { principal, requestId, correlationId, startTime: Date.now() },
      };
    } catch (err) {
      if (err instanceof AuthenticationError) {
        return { ok: false, status: err.statusCode, error: err.message };
      }
      const safeMsg = sanitizeLogMessage(err instanceof Error ? err.message : 'Unknown error');
      return { ok: false, status: 401, error: safeMsg };
    }
  }
}

export class AuthorizationMiddleware {
  constructor(private authService: IAuthorizationService) {}

  async handle(context: IdentityContext, requiredPermission: string, resourceOrgId?: string): Promise<IdentityMiddlewareResult> {
    if (!context.principal) {
      return { ok: false, status: 401, error: 'Authentication required' };
    }
    try {
      await this.authService.assertAccess(context.principal, requiredPermission, resourceOrgId);
      return { ok: true, context };
    } catch (err) {
      if (err instanceof AuthorizationError || err instanceof InsufficientPermissionsError) {
        return { ok: false, status: err.statusCode, error: err.message };
      }
      return { ok: false, status: 403, error: 'Access denied' };
    }
  }
}

export class OrganizationContextMiddleware {
  handle(context: IdentityContext, targetOrgId?: string): IdentityMiddlewareResult {
    if (!context.principal) {
      return { ok: false, status: 401, error: 'Authentication required' };
    }
    const orgId = targetOrgId ?? context.principal.organizationId;
    if (context.principal.organizationId !== orgId && !context.principal.roles.includes('PLATFORM_ADMIN')) {
      return { ok: false, status: 403, error: 'Cross-organization access denied' };
    }
    return { ok: true, context };
  }
}

export class PermissionMiddleware {
  constructor(private authService: IAuthorizationService) {}

  async handle(context: IdentityContext, requiredPermissions: string[], resourceOrgId?: string): Promise<IdentityMiddlewareResult> {
    if (!context.principal) {
      return { ok: false, status: 401, error: 'Authentication required' };
    }
    const hasAll = await this.authService.checkAccessAll(context.principal, requiredPermissions, resourceOrgId);
    if (!hasAll) {
      return { ok: false, status: 403, error: `Required permissions: ${requiredPermissions.join(', ')}` };
    }
    return { ok: true, context };
  }
}

export class AuditMiddleware {
  private logFn: (entry: AuditEntry) => void;

  constructor(logFn?: (entry: AuditEntry) => void) {
    this.logFn = logFn ?? ((_entry: AuditEntry) => {});
  }

  handle(context: IdentityContext, action: string, resourceType: string, resourceId?: string, result: 'SUCCESS' | 'FAILURE' = 'SUCCESS'): void {
    const entry: AuditEntry = {
      actorId:         context.principal?.actorId ?? 'anonymous',
      organizationId:  context.principal?.organizationId ?? 'unknown',
      action,
      resourceType,
      resourceId:      resourceId ?? null,
      result,
      requestId:       context.requestId,
      correlationId:   context.correlationId,
      timestamp:       new Date().toISOString(),
    };
    this.logFn(entry);
  }
}

export interface AuditEntry {
  actorId:        string;
  organizationId: string;
  action:         string;
  resourceType:   string;
  resourceId:     string | null;
  result:         'SUCCESS' | 'FAILURE';
  requestId:      string;
  correlationId:  string;
  timestamp:      string;
}
