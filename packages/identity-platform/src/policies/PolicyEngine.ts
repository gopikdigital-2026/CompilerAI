import type { Policy, PolicyStatement, PolicyDecision, PolicyCondition } from './PolicyModels';
import { ALLOW_DECISION, DENY_DECISION } from './PolicyModels';
import type { IPolicyRepository } from '../repositories/RepositoryInterfaces';
import { PolicyNotFoundError } from '../adapters/IdentityErrors';

export interface CreatePolicyRequest {
  name: string;
  description: string;
  organizationId: string;
  statements: PolicyStatement[];
  priority: number;
}

export class PolicyEngine {
  constructor(
    private readonly repo: IPolicyRepository,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {}

  async create(request: CreatePolicyRequest): Promise<Policy> {
    const now = this.clock();
    const policy: Policy = {
      id: this.idGen(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: request.organizationId,
      name: request.name,
      description: request.description,
      statements: request.statements,
      priority: request.priority,
      enabled: true,
    };
    return this.repo.create(policy);
  }

  async findById(id: string): Promise<Policy> {
    const policy = await this.repo.findById(id);
    if (!policy) throw new PolicyNotFoundError(`Policy not found: ${id}`);
    return policy;
  }

  async findByOrganization(organizationId: string): Promise<Policy[]> {
    return this.repo.findByOrganization(organizationId);
  }

  async update(id: string, updates: Partial<Pick<Policy, 'name' | 'description' | 'statements' | 'priority' | 'enabled'>>): Promise<Policy> {
    const policy = await this.findById(id);
    const updated: Policy = {
      ...policy,
      ...updates,
      version: policy.version + 1,
      updatedAt: this.clock(),
    };
    return this.repo.update(updated);
  }

  async delete(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }

  async evaluate(
    organizationId: string,
    permission: string,
    context: Record<string, unknown> = {},
  ): Promise<PolicyDecision> {
    const policies = await this.repo.findByOrganization(organizationId);

    for (const policy of policies) {
      for (const stmt of policy.statements) {
        if (this.statementMatches(stmt, permission, context)) {
          if (stmt.effect === 'DENY') {
            return DENY_DECISION(`Denied by policy: ${policy.name}`, policy.id);
          }
          return ALLOW_DECISION(`Allowed by policy: ${policy.name}`, policy.id);
        }
      }
    }

    return ALLOW_DECISION('No matching policy found — default allow', null);
  }

  private statementMatches(stmt: PolicyStatement, permission: string, context: Record<string, unknown>): boolean {
    const permMatch = stmt.permissions.includes('*') || stmt.permissions.includes(permission);
    if (!permMatch) return false;

    for (const cond of stmt.conditions) {
      if (!this.evaluateCondition(cond, context)) return false;
    }
    return true;
  }

  private evaluateCondition(cond: PolicyCondition, context: Record<string, unknown>): boolean {
    const value = context[cond.field];
    switch (cond.operator) {
      case 'eq': return value === cond.value;
      case 'ne': return value !== cond.value;
      case 'in': return Array.isArray(cond.value) && cond.value.includes(value);
      case 'not_in': return Array.isArray(cond.value) && !cond.value.includes(value);
      case 'gt': return typeof value === 'number' && value > (cond.value as number);
      case 'lt': return typeof value === 'number' && value < (cond.value as number);
      case 'regex':
        return typeof value === 'string' && new RegExp(cond.value as string).test(value);
      default: return false;
    }
  }
}
