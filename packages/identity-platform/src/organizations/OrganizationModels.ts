import type { BaseEntity } from '../types/shared';

export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type OrganizationPlan = 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';

export interface OrganizationSettings {
  maxUsers: number;
  maxApiKeys: number;
  maxSessions: number;
  enforceMfa: boolean;
  sessionTimeoutMs: number;
  allowedIpRanges: string[];
}

export const DEFAULT_ORG_SETTINGS: OrganizationSettings = {
  maxUsers: 50,
  maxApiKeys: 20,
  maxSessions: 10,
  enforceMfa: false,
  sessionTimeoutMs: 3_600_000,
  allowedIpRanges: [],
};

export const PLAN_LIMITS: Record<OrganizationPlan, Partial<OrganizationSettings>> = {
  FREE: { maxUsers: 5, maxApiKeys: 3, maxSessions: 3 },
  STARTER: { maxUsers: 25, maxApiKeys: 10, maxSessions: 5 },
  PRO: { maxUsers: 100, maxApiKeys: 50, maxSessions: 20 },
  ENTERPRISE: { maxUsers: 1000, maxApiKeys: 500, maxSessions: 100 },
};

export interface Organization extends BaseEntity {
  name: string;
  slug: string;
  status: OrganizationStatus;
  plan: OrganizationPlan;
  settings: OrganizationSettings;
  ownerUserId: string;
}
