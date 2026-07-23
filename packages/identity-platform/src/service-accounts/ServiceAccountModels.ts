import type { OrganizationScopedEntity } from '../types/shared';

export type ServiceAccountStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

export interface ServiceAccount extends OrganizationScopedEntity {
  name: string;
  description: string;
  status: ServiceAccountStatus;
  keyHash: string;
  keyPreview: string;
  roleIds: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export const SERVICE_ACCOUNT_PREFIX = 'sa_';

export function isServiceAccountActive(account: ServiceAccount, now: string): boolean {
  if (account.status !== 'ACTIVE') return false;
  if (account.expiresAt && account.expiresAt < now) return false;
  return true;
}
