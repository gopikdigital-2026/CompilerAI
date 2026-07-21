import type { IDecisionExtractor } from '../interfaces/IDecisionExtractor';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionItem } from '../models/DecisionItem';
import type { DecisionType } from '../models/DecisionType';
import type { DecisionRequest } from '../models/DecisionRequest';
import type { RiskLevel } from '../../planning/models/PlanRisk';
import { nodeTypeToDecisionType, shouldExtractFromRisk } from '../rules/DecisionRules';

// ─── Decision Extractor ────────────────────────────────────────────────────────
// Identifies decision points within an ExecutionPlan. Does not reconstruct the plan.

let decisionCounter = 0;

export class DecisionExtractor implements IDecisionExtractor {
  readonly id = 'decision-extractor-v1';

  extract(plan: ExecutionPlan, scope: DecisionRequest['requestedDecisionScope']): DecisionItem[] {
    const decisions: DecisionItem[] = [];

    for (const node of plan.graph.nodes) {
      const dt = nodeTypeToDecisionType(node.type);
      if (!dt) continue;

      if (scope === 'HIGH_IMPACT_ONLY' && node.riskLevel !== 'HIGH' && node.riskLevel !== 'CRITICAL') {
        continue;
      }
      if (scope === 'APPROVAL_GATES_ONLY' && dt !== 'HUMAN_APPROVAL_GATE') {
        continue;
      }

      decisions.push(this.buildDecision(node, dt, plan));
    }

    // Extract risk-response decisions for HIGH/CRITICAL risks not already covered
    for (const risk of plan.risks) {
      if (!shouldExtractFromRisk(risk.level)) continue;
      const alreadyCovered = decisions.some(d =>
        d.sourceNodeIds.some(id => risk.nodeIds.includes(id)),
      );
      if (alreadyCovered) continue;

      decisions.push(this.buildRiskDecision(risk, plan));
    }

    return decisions;
  }

  private buildDecision(
    node: ExecutionPlan['graph']['nodes'][number],
    dt: DecisionType,
    plan: ExecutionPlan,
  ): DecisionItem {
    const decisionId = `decision-${decisionCounter++}`;
    return {
      decisionId,
      title: node.title,
      description: node.description,
      decisionType: dt,
      sourceNodeIds: [node.nodeId],
      objective: node.objective,
      criteria: [],
      alternatives: [],
      recommendedAlternativeId: '',
      rationale: {
        chosenAlternativeId: '',
        chosenTitle: '',
        selectionReason: '',
        rejectedAlternatives: [],
        remainingRisks: [],
        assumptions: [],
        missingData: [],
        criteriaSummary: '',
      },
      confidenceScore: plan.confidenceScore,
      riskLevel: node.riskLevel,
      conflicts: [],
      assumptions: plan.assumptions,
      requiresHumanApproval: node.requiresHumanApproval,
      approvalReason: node.approvalReason,
      reversible: !node.requiresHumanApproval,
      status: 'READY',
    };
  }

  private buildRiskDecision(
    risk: ExecutionPlan['risks'][number],
    plan: ExecutionPlan,
  ): DecisionItem {
    const decisionId = `decision-${decisionCounter++}`;
    return {
      decisionId,
      title: `Risk Response: ${risk.kind}`,
      description: risk.description,
      decisionType: 'RISK_RESPONSE',
      sourceNodeIds: risk.nodeIds,
      objective: risk.mitigation,
      criteria: [],
      alternatives: [],
      recommendedAlternativeId: '',
      rationale: {
        chosenAlternativeId: '',
        chosenTitle: '',
        selectionReason: '',
        rejectedAlternatives: [],
        remainingRisks: [risk.description],
        assumptions: [],
        missingData: [],
        criteriaSummary: '',
      },
      confidenceScore: plan.confidenceScore,
      riskLevel: risk.level as RiskLevel,
      conflicts: [],
      assumptions: plan.assumptions,
      requiresHumanApproval: risk.level === 'CRITICAL',
      approvalReason: risk.level === 'CRITICAL' ? 'HIGH_IMPACT_LOW_CONFIDENCE' : undefined,
      reversible: risk.level !== 'CRITICAL',
      status: 'READY',
    };
  }
}
