import type { Agent, AgentTask, AgentProfile } from '../models/AgentModels';
import { AgentPermissionError, AgentCapabilityError } from '../errors/AgentErrors';

export interface IPolicyValidationResult {
  allowed: boolean;
  errors: string[];
  warnings: string[];
}

export interface IAgentPolicyEngine {
  validateAgentForTask(agent: Agent, task: AgentTask): IPolicyValidationResult;
  validateAgentForOrganization(agent: Agent, organizationId: string): IPolicyValidationResult;
  validateProfile(profile: AgentProfile): IPolicyValidationResult;
  assertAgentForTask(agent: Agent, task: AgentTask): void;
  assertOrganization(agent: Agent, organizationId: string): void;
}

export class AgentPolicyEngine implements IAgentPolicyEngine {
  private readonly blockedPermissions: ReadonlySet<string>;

  constructor(blockedPermissions: string[] = []) {
    this.blockedPermissions = new Set(blockedPermissions);
  }

  validateAgentForTask(agent: Agent, task: AgentTask): IPolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const hasCapabilities = task.requiredCapabilities.every((cap) =>
      agent.profile.capabilities.includes(cap),
    );
    if (!hasCapabilities) {
      const missing = task.requiredCapabilities.filter(
        (cap) => !agent.profile.capabilities.includes(cap),
      );
      errors.push(`Agent ${agent.id} missing required capabilities: ${missing.join(', ')}`);
    }

    const hasPermissions = task.requiredPermissions.every((perm) =>
      agent.profile.requiredPermissions.includes(perm),
    );
    if (!hasPermissions) {
      const missing = task.requiredPermissions.filter(
        (perm) => !agent.profile.requiredPermissions.includes(perm),
      );
      errors.push(`Agent ${agent.id} missing required permissions: ${missing.join(', ')}`);
    }

    for (const perm of agent.profile.requiredPermissions) {
      if (this.blockedPermissions.has(perm)) {
        errors.push(`Agent ${agent.id} has blocked permission: ${perm}`);
      }
    }

    if (agent.profile.maxDurationMs < task.maxDurationMs) {
      warnings.push(
        `Agent max duration (${agent.profile.maxDurationMs}ms) is less than task requires (${task.maxDurationMs}ms)`,
      );
    }

    if (agent.profile.confidenceLevel < 0.5) {
      warnings.push(`Agent ${agent.id} has low confidence level: ${agent.profile.confidenceLevel}`);
    }

    return { allowed: errors.length === 0, errors, warnings };
  }

  validateAgentForOrganization(agent: Agent, organizationId: string): IPolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (agent.organizationId !== organizationId) {
      errors.push(
        `Agent ${agent.id} belongs to organization ${agent.organizationId}, not ${organizationId}`,
      );
    }

    return { allowed: errors.length === 0, errors, warnings };
  }

  validateProfile(profile: AgentProfile): IPolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!profile.id || profile.id.length === 0) {
      errors.push('Profile id must be non-empty');
    }
    if (!profile.name || profile.name.length < 2) {
      errors.push('Profile name must be at least 2 characters');
    }
    if (profile.capabilities.length === 0) {
      warnings.push('Profile has no declared capabilities');
    }
    if (profile.estimatedCost < 0) {
      errors.push('Estimated cost must be non-negative');
    }
    if (profile.maxDurationMs <= 0) {
      errors.push('Max duration must be positive');
    }
    if (profile.confidenceLevel < 0 || profile.confidenceLevel > 1) {
      errors.push('Confidence level must be between 0 and 1');
    }

    for (const perm of profile.requiredPermissions) {
      if (this.blockedPermissions.has(perm)) {
        errors.push(`Profile declares blocked permission: ${perm}`);
      }
    }

    return { allowed: errors.length === 0, errors, warnings };
  }

  assertAgentForTask(agent: Agent, task: AgentTask): void {
    const result = this.validateAgentForTask(agent, task);
    if (!result.allowed) {
      if (result.errors.some((e) => e.includes('capabilities'))) {
        throw new AgentCapabilityError(result.errors.join('; '));
      }
      throw new AgentPermissionError(result.errors.join('; '));
    }
  }

  assertOrganization(agent: Agent, organizationId: string): void {
    const result = this.validateAgentForOrganization(agent, organizationId);
    if (!result.allowed) {
      throw new AgentPermissionError(result.errors.join('; '));
    }
  }
}
