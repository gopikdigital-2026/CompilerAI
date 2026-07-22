// ─── ToolEligibilityValidator ───────────────────────────────────────────────────
// Validates tool eligibility against context, policy, and confidence.

import type { IToolEligibilityValidator, ToolSelectionContext } from '../interfaces/IToolIntelligenceEngine';
import type { ToolDefinition } from '../models/ToolDefinition';
import type { ToolCandidate } from '../models/ToolCandidate';
import type { ToolPolicy } from '../models/ToolPolicy';
import type { RequiredCapability } from '../../intent/models/RequiredCapability';
import { ToolPermissionEvaluator } from './ToolPermissionEvaluator';
import { meetsConfidenceThreshold } from '../policies/ToolPolicies';

export class ToolEligibilityValidator implements IToolEligibilityValidator {
  private readonly permissionEvaluator: ToolPermissionEvaluator;

  constructor() {
    this.permissionEvaluator = new ToolPermissionEvaluator();
  }

  validate(tool: ToolDefinition, context: ToolSelectionContext, policy: ToolPolicy): ToolCandidate {
    const requiredCaps = this.extractRequiredCapabilities(context);
    const matched = tool.capabilities.filter(c => requiredCaps.includes(c.requiredCapability));
    const coverageScore = requiredCaps.length > 0 ? matched.length / requiredCaps.length : 1;

    const reasons: string[] = [];

    // Check tool status
    if (tool.status !== 'ACTIVE') reasons.push(`Tool ${tool.toolId} is not active (status: ${tool.status}).`);

    // Check permissions
    const permResult = this.permissionEvaluator.evaluate(tool, policy);
    if (!permResult.allowed) reasons.push(...permResult.reasons);

    // Check confidence threshold
    const confidence = context.confidenceResult?.overallScore ?? 100;
    if (!meetsConfidenceThreshold(tool.requirements.minConfidenceThreshold, confidence)) {
      reasons.push(`Confidence ${confidence} below tool minimum ${tool.requirements.minConfidenceThreshold}.`);
    }

    // Check incompatibility with already-selected tools (checked later in plan builder)
    // Check memory sensitivity — if tool requires sensitive data, ensure context allows it
    if (context.memoryEntries) {
      const hasSensitiveMemory = context.memoryEntries.some(m => m.type === 'CONFIDENTIAL' || m.type === 'RESTRICTED');
      if (hasSensitiveMemory && tool.requirements.maxDataSensitivity === 'PUBLIC') {
        reasons.push(`Tool ${tool.toolId} cannot process sensitive memory data.`);
      }
    }

    return {
      tool,
      matchedCapabilities: matched,
      coverageScore,
      eligible: reasons.length === 0,
      ineligibilityReasons: reasons,
    };
  }

  private extractRequiredCapabilities(context: ToolSelectionContext): RequiredCapability[] {
    return context.intentResult?.requiredCapabilities ?? [];
  }
}
