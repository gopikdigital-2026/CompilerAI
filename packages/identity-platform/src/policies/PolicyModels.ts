import type { OrganizationScopedEntity } from '../types/shared';

export type PolicyEffect = 'ALLOW' | 'DENY';
export type PolicyConditionOperator = 'eq' | 'ne' | 'in' | 'not_in' | 'gt' | 'lt' | 'regex';

export interface PolicyCondition {
  field: string;
  operator: PolicyConditionOperator;
  value: unknown;
}

export interface PolicyStatement {
  effect: PolicyEffect;
  permissions: string[];
  resources: string[];
  conditions: PolicyCondition[];
}

export interface Policy extends OrganizationScopedEntity {
  name: string;
  description: string;
  statements: PolicyStatement[];
  priority: number;
  enabled: boolean;
}

export interface PolicyDecision {
  allowed: boolean;
  reason: string;
  matchedPolicyId: string | null;
  deniedPolicyId: string | null;
}

export const ALLOW_DECISION = (reason: string, policyId: string | null = null): PolicyDecision => ({
  allowed: true,
  reason,
  matchedPolicyId: policyId,
  deniedPolicyId: null,
});

export const DENY_DECISION = (reason: string, policyId: string | null = null): PolicyDecision => ({
  allowed: false,
  reason,
  matchedPolicyId: null,
  deniedPolicyId: policyId,
});
