// ─── ToolPlanBuilder ────────────────────────────────────────────────────────────
// Builds a ToolExecutionPlan from selections, handling fallbacks and incompatibilities.

import type { IToolPlanBuilder, ToolSelectionContext } from '../interfaces/IToolIntelligenceEngine';
import type { ToolSelection } from '../models/ToolSelection';
import type { ToolCandidate } from '../models/ToolCandidate';
import type { ToolExecutionPlan, ToolPlanStep, ToolPlanStatus } from '../models/ToolExecutionPlan';
import type { ToolRiskAssessment } from '../models/ToolRiskAssessment';

const VERSION = '1.0.0';

export class ToolPlanBuilder implements IToolPlanBuilder {
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(idGenerator: () => string, clock: () => string) {
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  build(
    selections: ToolSelection[],
    candidates: ToolCandidate[],
    riskAssessment: ToolRiskAssessment,
    context: ToolSelectionContext,
  ): ToolExecutionPlan {
    const warnings: string[] = [];
    let fallbacksUsed = 0;

    // Filter out selections for tools that are in incompatibility conflicts
    const conflictToolIds = new Set(riskAssessment.incompatibleTools.flatMap(c => [c.toolA, c.toolB]));
    const cleanSelections = selections.filter(s => !conflictToolIds.has(s.toolId));

    if (cleanSelections.length < selections.length) {
      warnings.push(`${selections.length - cleanSelections.length} tool(s) removed due to incompatibility conflicts.`);
    }

    // Apply fallback for removed tools
    const finalSelections: ToolSelection[] = [];
    for (const sel of selections) {
      if (conflictToolIds.has(sel.toolId)) {
        // Try to find a fallback
        const fallback = this.findFallback(sel.toolId, candidates, conflictToolIds);
        if (fallback) {
          finalSelections.push({
            ...fallback,
            rank: sel.rank,
            fallbackForToolId: sel.toolId,
          });
          fallbacksUsed++;
          warnings.push(`Fallback used: ${fallback.toolName} replaces ${sel.toolId}.`);
        } else {
          warnings.push(`No fallback available for removed tool ${sel.toolId}.`);
        }
      } else {
        finalSelections.push(sel);
      }
    }

    // Build steps
    const steps: ToolPlanStep[] = finalSelections.map((sel, idx) => {
      const candidate = candidates.find(c => c.tool.toolId === sel.toolId);
      const tool = candidate?.tool;
      return {
        stepId: this.idGenerator(),
        toolId: sel.toolId,
        toolName: sel.toolName,
        order: idx + 1,
        selection: sel,
        expectedCapabilities: tool?.capabilities.map(c => c.requiredCapability) ?? [],
        isFallback: sel.fallbackForToolId !== null,
      };
    });

    // Determine status
    let status: ToolPlanStatus = 'READY';
    if (steps.length === 0) status = 'EMPTY';
    else if (riskAssessment.overallRiskLevel === 'HIGH' || riskAssessment.overallRiskLevel === 'CRITICAL') status = 'PARTIAL';
    if (riskAssessment.requiresHumanApproval) status = 'PARTIAL';
    if (warnings.some(w => w.includes('No fallback'))) status = 'BLOCKED';

    return {
      planId: this.idGenerator(),
      executionId: context.organizationId, // Will be replaced by engine
      organizationId: context.organizationId,
      status,
      steps,
      riskAssessment,
      totalTools: steps.length,
      fallbacksUsed,
      warnings,
      createdAt: this.clock(),
      version: VERSION,
    };
  }

  private findFallback(
    removedToolId: string,
    candidates: ToolCandidate[],
    conflictToolIds: Set<string>,
  ): ToolSelection | null {
    for (const c of candidates) {
      if (!c.eligible) continue;
      if (conflictToolIds.has(c.tool.toolId)) continue;
      if (c.tool.canFallback && c.tool.fallbackFor.includes(removedToolId)) {
        return {
          selectionId: this.idGenerator(),
          toolId: c.tool.toolId,
          toolName: c.tool.name,
          rank: 0,
          totalScore: 0,
          rationales: [{ factor: 'fallback', score: 50, reason: `Fallback for ${removedToolId}.` }],
          selected: true,
          fallbackForToolId: null,
        };
      }
    }
    return null;
  }
}
