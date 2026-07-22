// ─── Organization domain models ─────────────────────────────────────────────────

export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type OrganizationPlan = 'free' | 'pro' | 'enterprise';

export interface OrganizationSettings {
  allowPublicWorkflows:   boolean;
  requireApprovalForExec: boolean;
  defaultRiskTolerance:   'LOW' | 'MEDIUM' | 'HIGH';
  maxConcurrentExecutions: number;
  branding?: {
    primaryColor?: string;
    logoUrl?:      string;
  };
}

export interface OrganizationLimits {
  maxWorkflows:       number;
  maxExecutionsPerDay: number;
  maxApiKeys:         number;
  maxUsers:           number;
  maxStorageMb:       number;
}

export const DEFAULT_ORG_SETTINGS: OrganizationSettings = {
  allowPublicWorkflows: false,
  requireApprovalForExec: false,
  defaultRiskTolerance: 'MEDIUM',
  maxConcurrentExecutions: 10,
};

export const PLAN_LIMITS: Record<OrganizationPlan, OrganizationLimits> = {
  free: {
    maxWorkflows: 10,
    maxExecutionsPerDay: 100,
    maxApiKeys: 3,
    maxUsers: 5,
    maxStorageMb: 100,
  },
  pro: {
    maxWorkflows: 100,
    maxExecutionsPerDay: 1000,
    maxApiKeys: 20,
    maxUsers: 50,
    maxStorageMb: 1024,
  },
  enterprise: {
    maxWorkflows: -1,
    maxExecutionsPerDay: -1,
    maxApiKeys: -1,
    maxUsers: -1,
    maxStorageMb: -1,
  },
};

export interface Organization {
  organizationId:   string;
  name:             string;
  slug:             string;
  plan:             OrganizationPlan;
  status:           OrganizationStatus;
  settings:         OrganizationSettings;
  limits:           OrganizationLimits;
  logoUrl:          string | null;
  createdAt:        string;
  updatedAt:        string;
}
