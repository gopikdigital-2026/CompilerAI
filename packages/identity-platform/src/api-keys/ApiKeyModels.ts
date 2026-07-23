import type { OrganizationScopedEntity } from '../types/shared';

export type ApiKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';
export type ApiKeyScope = 'read' | 'write' | 'admin' | '*';

export interface ApiKey extends OrganizationScopedEntity {
  name: string;
  keyHash: string;
  keyPreview: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  createdByUserId: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedByUserId: string | null;
}

export const API_KEY_PREFIX = 'ck_live_';

export const VALID_SCOPES: ApiKeyScope[] = ['read', 'write', 'admin', '*'];

export function validateScopes(scopes: ApiKeyScope[]): boolean {
  return scopes.every((s) => VALID_SCOPES.includes(s));
}

export function hasScope(apiKeyScopes: ApiKeyScope[], required: ApiKeyScope): boolean {
  if (apiKeyScopes.includes('*')) return true;
  if (apiKeyScopes.includes('admin')) return required !== '*';
  if (apiKeyScopes.includes('write')) return required === 'read' || required === 'write';
  return apiKeyScopes.includes(required);
}

export function isApiKeyActive(key: ApiKey, now: string): boolean {
  if (key.status !== 'ACTIVE') return false;
  if (key.expiresAt && key.expiresAt < now) return false;
  return true;
}
