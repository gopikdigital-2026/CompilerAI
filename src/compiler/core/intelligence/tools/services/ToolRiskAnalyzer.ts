// ─── ToolRiskAnalyzer ───────────────────────────────────────────────────────────
// Analyzes risk factors for selected tools — incompatibility, sensitivity, approvals.

import type { IToolRiskAnalyzer, ToolSelectionContext } from '../interfaces/IToolIntelligenceEngine';
import type { ToolDefinition } from '../models/ToolDefinition';
import type { ToolRiskAssessment, ToolRiskFactor } from '../models/ToolRiskAssessment';
import type { RiskLevel } from '../../planning/models/PlanRisk';
import { findIncompatibleTools } from '../policies/ToolPolicies';

const RISK_ORDER: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

export class ToolRiskAnalyzer implements IToolRiskAnalyzer {
  private readonly idGenerator: () => string;

  constructor(idGenerator: () => string) {
    this.idGenerator = idGenerator;
  }

  analyze(selected: ToolDefinition[], context: ToolSelectionContext): ToolRiskAssessment {
    const riskFactors: ToolRiskFactor[] = [];
    let maxRiskIdx = 0;

    // 1. Incompatibility detection
    const incompatible = findIncompatibleTools(selected);
    if (incompatible.length > 0) {
      riskFactors.push({
        factorId: this.idGenerator(),
        description: `${incompatible.length} incompatibility conflict(s) detected.`,
        level: 'HIGH',
        toolIds: incompatible.flatMap(c => [c.toolA, c.toolB]),
      });
      maxRiskIdx = Math.max(maxRiskIdx, RISK_ORDER.indexOf('HIGH'));
    }

    // 2. Sensitive data exposure
    const sensitiveTools = selected.filter(t => t.requirements.maxDataSensitivity === 'CONFIDENTIAL' || t.requirements.maxDataSensitivity === 'RESTRICTED');
    const sensitiveDataExposure = sensitiveTools.length > 0;
    if (sensitiveDataExposure) {
      riskFactors.push({
        factorId: this.idGenerator(),
        description: `${sensitiveTools.length} tool(s) process sensitive data.`,
        level: 'MEDIUM',
        toolIds: sensitiveTools.map(t => t.toolId),
      });
      maxRiskIdx = Math.max(maxRiskIdx, RISK_ORDER.indexOf('MEDIUM'));
    }

    // 3. Human approval tools
    const approvalTools = selected.filter(t => t.capabilities.some(c => c.requiredCapability === 'HUMAN_APPROVAL'));
    const requiresHumanApproval = approvalTools.length > 0 || (context.decisionResult?.requiresReplanning ?? false);
    if (requiresHumanApproval) {
      riskFactors.push({
        factorId: this.idGenerator(),
        description: 'Selected tools include human approval capabilities.',
        level: 'MEDIUM',
        toolIds: approvalTools.map(t => t.toolId),
      });
      maxRiskIdx = Math.max(maxRiskIdx, RISK_ORDER.indexOf('MEDIUM'));
    }

    // 4. External data access
    const externalTools = selected.filter(t => t.capabilities.some(c => c.requiredCapability === 'EXTERNAL_DATA_ACCESS'));
    if (externalTools.length > 0) {
      riskFactors.push({
        factorId: this.idGenerator(),
        description: `${externalTools.length} tool(s) access external data sources.`,
        level: 'MEDIUM',
        toolIds: externalTools.map(t => t.toolId),
      });
      maxRiskIdx = Math.max(maxRiskIdx, RISK_ORDER.indexOf('MEDIUM'));
    }

    // 5. Low confidence context
    const confidence = context.confidenceResult?.overallScore ?? 100;
    if (confidence < 50) {
      riskFactors.push({
        factorId: this.idGenerator(),
        description: `Low pipeline confidence (${confidence}/100) increases tool selection risk.`,
        level: 'HIGH',
        toolIds: selected.map(t => t.toolId),
      });
      maxRiskIdx = Math.max(maxRiskIdx, RISK_ORDER.indexOf('HIGH'));
    }

    const recommendations: string[] = [];
    if (incompatible.length > 0) recommendations.push('Resolve tool incompatibilities before execution.');
    if (sensitiveDataExposure) recommendations.push('Ensure sensitive data handling complies with org policy.');
    if (requiresHumanApproval) recommendations.push('Human approval is required before proceeding.');
    if (selected.length === 0) recommendations.push('No tools selected — consider broadening eligibility criteria.');

    return {
      assessmentId: this.idGenerator(),
      overallRiskLevel: RISK_ORDER[maxRiskIdx],
      riskFactors,
      incompatibleTools: incompatible,
      sensitiveDataExposure,
      requiresHumanApproval,
      recommendations,
    };
  }
}
