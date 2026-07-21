import type { IDecisionValidator } from '../interfaces/IDecisionValidator';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionItem } from '../models/DecisionItem';
import type {
  DecisionValidationResult, DecisionValidationError, DecisionValidationWarning,
} from '../models/DecisionValidationResult';
import type { DecisionStatus } from '../models/DecisionStatus';

// ─── Decision Validator ────────────────────────────────────────────────────────
// Validates the decision result for structural and semantic coherence.

export class DecisionValidator implements IDecisionValidator {
  readonly id = 'decision-validator-v1';

  validate(decisions: DecisionItem[], plan: ExecutionPlan): DecisionValidationResult {
    const errors: DecisionValidationError[] = [];
    const warnings: DecisionValidationWarning[] = [];
    const blockers: string[] = [];

    // Plan must be valid
    if (plan.status === 'INVALID') {
      errors.push({ code: 'INVALID_PLAN', message: 'ExecutionPlan is invalid' });
    }
    if (plan.status === 'BLOCKED') {
      blockers.push('ExecutionPlan is blocked');
    }

    // Each decision must have alternatives
    for (const d of decisions) {
      if (d.alternatives.length === 0) {
        errors.push({
          code: 'NO_ALTERNATIVES', message: `Decision "${d.decisionId}" has no alternatives`,
          decisionId: d.decisionId,
        });
      }

      // Recommended alternative must exist
      if (d.recommendedAlternativeId && !d.alternatives.some(a => a.alternativeId === d.recommendedAlternativeId)) {
        errors.push({
          code: 'RECOMMENDED_NOT_FOUND',
          message: `Recommended alternative "${d.recommendedAlternativeId}" not found in decision "${d.decisionId}"`,
          decisionId: d.decisionId,
        });
      }

      // Criterion weights must be valid (0–1)
      for (const c of d.criteria) {
        if (c.weight < 0 || c.weight > 1) {
          errors.push({
            code: 'INVALID_CRITERION_WEIGHT',
            message: `Criterion "${c.kind}" has invalid weight ${c.weight} (must be 0–1)`,
            decisionId: d.decisionId,
          });
        }
        if (c.score < 0 || c.score > 100) {
          errors.push({
            code: 'INVALID_CRITERION_SCORE',
            message: `Criterion "${c.kind}" has invalid score ${c.score} (must be 0–100)`,
            decisionId: d.decisionId,
          });
        }
      }

      // Recommended alternative must be viable
      const rec = d.alternatives.find(a => a.alternativeId === d.recommendedAlternativeId);
      if (rec) {
        const evalResult = rec.evaluations.find(e => e.alternativeId === rec.alternativeId);
        if (evalResult && !evalResult.viable) {
          warnings.push({
            code: 'RECOMMENDED_NOT_VIABLE',
            message: `Recommended alternative for "${d.title}" is not viable`,
            decisionId: d.decisionId,
          });
        }
      }

      // Source node IDs must exist in the plan
      const nodeIds = new Set(plan.graph.nodes.map(n => n.nodeId));
      for (const srcId of d.sourceNodeIds) {
        if (!nodeIds.has(srcId)) {
          warnings.push({
            code: 'SOURCE_NODE_NOT_FOUND',
            message: `Source node "${srcId}" not found in plan`,
            decisionId: d.decisionId,
          });
        }
      }

      // Approval must be marked when required
      if (d.requiresHumanApproval && !d.approvalReason) {
        warnings.push({
          code: 'APPROVAL_REASON_MISSING',
          message: `Decision "${d.title}" requires approval but has no reason`,
          decisionId: d.decisionId,
        });
      }
    }

    // At least one decision when the plan requires it
    if (decisions.length === 0 && plan.graph.nodes.length > 1) {
      warnings.push({ code: 'NO_DECISIONS', message: 'Plan has nodes but no decisions were extracted' });
    }

    const recommendedStatus = this.deriveStatus(errors, blockers, decisions, plan);

    return {
      isValid: errors.length === 0 && blockers.length === 0,
      errors, warnings, blockers, recommendedStatus,
    };
  }

  private deriveStatus(
    errors: DecisionValidationError[], blockers: string[],
    decisions: DecisionItem[], plan: ExecutionPlan,
  ): DecisionStatus {
    if (errors.length > 0) return 'INVALID';
    if (blockers.length > 0) return 'BLOCKED';

    // Check for replanning signals
    const noViable = decisions.filter(d => d.alternatives.length === 0);
    if (noViable.length > 0) return 'REPLAN_REQUIRED';

    // Check for clarification
    if (plan.status === 'NEEDS_CLARIFICATION') return 'NEEDS_CLARIFICATION';

    // Check for data needs
    if (plan.status === 'NEEDS_DATA') return 'NEEDS_DATA';

    // Check for approval
    if (decisions.some(d => d.requiresHumanApproval)) return 'REQUIRES_APPROVAL';

    return 'READY';
  }
}
