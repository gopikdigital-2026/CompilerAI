import type { OrganizationScopedEntity } from '../types/shared';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'PERMISSIONS_CHANGED'
  | 'API_KEY_CREATED'
  | 'API_KEY_REVOKED'
  | 'API_KEY_USED'
  | 'SESSION_CREATED'
  | 'SESSION_REVOKED'
  | 'ACCESS_DENIED'
  | 'ROLE_ASSIGNED'
  | 'ROLE_REVOKED'
  | 'POLICY_CREATED'
  | 'POLICY_UPDATED'
  | 'ORG_CREATED'
  | 'ORG_UPDATED';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditEntry extends OrganizationScopedEntity {
  action: AuditAction;
  actorId: string;
  actorType: 'USER' | 'API_KEY' | 'SERVICE_ACCOUNT' | 'SYSTEM';
  targetType: string;
  targetId: string;
  severity: AuditSeverity;
  ipAddress: string | null;
  detail: Record<string, unknown>;
  success: boolean;
}

export const SENSITIVE_AUDIT_FIELDS = ['password', 'passwordHash', 'keyHash', 'token', 'tokenHash', 'secret', 'apiKey'];

export function sanitizeAuditDetail(detail: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (SENSITIVE_AUDIT_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeAuditDetail(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}
