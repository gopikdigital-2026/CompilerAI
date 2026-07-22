// ─── ToolPermissionEvaluator ────────────────────────────────────────────────────
// Evaluates whether the organization has permissions to use a tool.

import type { IToolPermissionEvaluator } from '../interfaces/IToolIntelligenceEngine';
import type { ToolDefinition } from '../models/ToolDefinition';
import type { ToolPolicy } from '../models/ToolPolicy';
import {
  isToolAllowed, hasRequiredPermissions, isWithinSensitivityLimit,
  checkConsent, checkOrgTier,
} from '../policies/ToolPolicies';

export class ToolPermissionEvaluator implements IToolPermissionEvaluator {
  evaluate(tool: ToolDefinition, policy: ToolPolicy): { allowed: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (!isToolAllowed(tool, policy)) {
      reasons.push(`Tool ${tool.toolId} is not in the allowed list or is denied for organization ${policy.organizationId}.`);
    }
    if (!hasRequiredPermissions(tool.requirements.requiredPermissions, policy.grantedPermissions)) {
      reasons.push(`Missing required permissions for ${tool.toolId}.`);
    }
    if (!isWithinSensitivityLimit(tool.requirements.maxDataSensitivity, policy.maxDataSensitivity)) {
      reasons.push(`Tool ${tool.toolId} requires sensitivity ${tool.requirements.maxDataSensitivity} which exceeds org limit ${policy.maxDataSensitivity}.`);
    }
    if (!checkConsent(tool.requirements.requiresConsent, policy.consentGranted)) {
      reasons.push(`Tool ${tool.toolId} requires consent but it was not granted.`);
    }
    if (!checkOrgTier(tool.requirements.requiredOrgTiers, policy.orgTier)) {
      reasons.push(`Tool ${tool.toolId} requires org tier ${tool.requirements.requiredOrgTiers.join('/')} but org is ${policy.orgTier}.`);
    }

    return { allowed: reasons.length === 0, reasons };
  }
}
