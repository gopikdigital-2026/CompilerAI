// ─── Uncertainty rules ─────────────────────────────────────────────────────────
// Deterministic detection of uncertainty sources in existing engine results.

import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { RiskLevel } from '../../planning/models/PlanRisk';
import type { UncertaintyItem, UncertaintyType } from '../models/UncertaintyItem';

let counter = 0;
function nextId(): string {
  counter += 1;
  return `unc-${counter.toString().padStart(4, '0')}`;
}

function severityFromImpact(impact: string): RiskLevel {
  if (impact === 'CRITICAL') return 'CRITICAL';
  if (impact === 'HIGH') return 'HIGH';
  if (impact === 'MEDIUM') return 'MEDIUM';
  return 'LOW';
}

export function detectContextUncertainties(ctx: ContextResult): UncertaintyItem[] {
  const items: UncertaintyItem[] = [];
  for (const m of ctx.missingInformation) {
    const type: UncertaintyType = m.kind === 'ambiguous_intent' ? 'AMBIGUOUS_OBJECTIVE'
      : m.kind === 'missing_objective' ? 'AMBIGUOUS_OBJECTIVE'
      : m.kind === 'missing_constraint' ? 'INCOMPLETE_CONSTRAINT'
      : 'MISSING_DATA';
    items.push({
      uncertaintyId: nextId(),
      type,
      description: m.description,
      severity: m.severity === 'critical' ? 'CRITICAL'
        : m.severity === 'high' ? 'HIGH'
        : m.severity === 'medium' ? 'MEDIUM' : 'LOW',
      affectedSourceIds: [ctx.requestId],
      resolvable: m.resolvableBy.length > 0,
      suggestedResolution: m.question || 'Gather additional information.',
    });
  }
  if (ctx.status === 'NEEDS_CLARIFICATION') {
    items.push({
      uncertaintyId: nextId(),
      type: 'AMBIGUOUS_OBJECTIVE',
      description: 'Context requires clarification before reasoning can proceed.',
      severity: 'HIGH',
      affectedSourceIds: [ctx.requestId],
      resolvable: true,
      suggestedResolution: 'Answer clarifying questions to resolve ambiguity.',
    });
  }
  if (ctx.status === 'NEEDS_DATA') {
    items.push({
      uncertaintyId: nextId(),
      type: 'MISSING_DATA',
      description: 'Context indicates insufficient data sources.',
      severity: 'HIGH',
      affectedSourceIds: [ctx.requestId],
      resolvable: true,
      suggestedResolution: 'Connect recommended data sources.',
    });
  }
  return items;
}

export function detectIntentUncertainties(intent: IntentResult): UncertaintyItem[] {
  const items: UncertaintyItem[] = [];
  if (intent.ambiguityScore > 50) {
    items.push({
      uncertaintyId: nextId(),
      type: 'AMBIGUOUS_OBJECTIVE',
      description: `Intent ambiguity score is high (${intent.ambiguityScore}/100).`,
      severity: intent.ambiguityScore > 75 ? 'HIGH' : 'MEDIUM',
      affectedSourceIds: [intent.intentId],
      resolvable: true,
      suggestedResolution: 'Provide more specific objectives or constraints.',
    });
  }
  for (const a of intent.assumptions) {
    items.push({
      uncertaintyId: nextId(),
      type: 'UNVALIDATED_ASSUMPTION',
      description: `Assumption: ${a}`,
      severity: 'MEDIUM',
      affectedSourceIds: [intent.intentId],
      resolvable: true,
      suggestedResolution: 'Validate this assumption with enterprise data.',
    });
  }
  if (intent.requiresClarification) {
    items.push({
      uncertaintyId: nextId(),
      type: 'AMBIGUOUS_OBJECTIVE',
      description: 'Intent engine flagged that clarification is required.',
      severity: 'HIGH',
      affectedSourceIds: [intent.intentId],
      resolvable: true,
      suggestedResolution: intent.clarificationQuestions[0] || 'Clarify the request.',
    });
  }
  return items;
}

export function detectPlanUncertainties(plan: ExecutionPlan): UncertaintyItem[] {
  const items: UncertaintyItem[] = [];
  for (const a of plan.assumptions) {
    items.push({
      uncertaintyId: nextId(),
      type: 'UNVALIDATED_ASSUMPTION',
      description: `Plan assumption: ${a}`,
      severity: 'MEDIUM',
      affectedSourceIds: [plan.planId],
      resolvable: true,
      suggestedResolution: 'Validate assumption before execution.',
    });
  }
  if (plan.requiredDataSources.length > 0) {
    items.push({
      uncertaintyId: nextId(),
      type: 'EXTERNAL_DEPENDENCY',
      description: `Plan depends on ${plan.requiredDataSources.length} external data source(s).`,
      severity: plan.requiredDataSources.length > 2 ? 'HIGH' : 'MEDIUM',
      affectedSourceIds: [plan.planId],
      resolvable: true,
      suggestedResolution: 'Verify availability of external data sources.',
    });
  }
  for (const r of plan.risks) {
    if (r.level === 'HIGH' || r.level === 'CRITICAL') {
      items.push({
        uncertaintyId: nextId(),
        type: 'UNRESOLVED_CONFLICT',
        description: `Unresolved risk: ${r.description}`,
        severity: r.level,
        affectedSourceIds: r.nodeIds.length > 0 ? r.nodeIds : [plan.planId],
        resolvable: true,
        suggestedResolution: r.mitigation,
      });
    }
  }
  return items;
}

export function detectDecisionUncertainties(decision: DecisionResult): UncertaintyItem[] {
  const items: UncertaintyItem[] = [];
  for (const c of decision.unresolvedConflicts) {
    items.push({
      uncertaintyId: nextId(),
      type: 'UNRESOLVED_CONFLICT',
      description: `Conflict: ${c.description}`,
      severity: c.severity,
      affectedSourceIds: c.involvedDecisionIds,
      resolvable: c.resolvable,
      suggestedResolution: c.suggestedResolution,
    });
  }
  for (const a of decision.assumptions) {
    items.push({
      uncertaintyId: nextId(),
      type: 'UNVALIDATED_ASSUMPTION',
      description: `Decision assumption: ${a}`,
      severity: 'MEDIUM',
      affectedSourceIds: [decision.decisionResultId],
      resolvable: true,
      suggestedResolution: 'Validate assumption before proceeding.',
    });
  }
  // Marginal alternative gap
  for (const item of decision.decisions) {
    const evals = item.alternatives
      .flatMap(a => a.evaluations)
      .sort((a, b) => b.weightedScore - a.weightedScore);
    if (evals.length >= 2 && (evals[0].weightedScore - evals[1].weightedScore) < 5) {
      items.push({
        uncertaintyId: nextId(),
        type: 'MARGINAL_ALTERNATIVE_GAP',
        description: `Alternatives nearly tied in decision "${item.title}".`,
        severity: 'MEDIUM',
        affectedSourceIds: [item.decisionId],
        resolvable: true,
        suggestedResolution: 'Gather more evidence to differentiate alternatives.',
      });
    }
  }
  // Irreversible decisions
  for (const item of decision.decisions) {
    if (!item.reversible) {
      items.push({
        uncertaintyId: nextId(),
        type: 'IRREVERSIBLE_DECISION',
        description: `Decision "${item.title}" is irreversible.`,
        severity: item.riskLevel,
        affectedSourceIds: [item.decisionId],
        resolvable: false,
        suggestedResolution: 'Ensure human review before proceeding.',
      });
    }
  }
  return items;
}

export function detectMissingDataUncertainties(
  ctx: ContextResult | undefined,
  intent: IntentResult | undefined,
  plan: ExecutionPlan | undefined,
  decision: DecisionResult | undefined,
): UncertaintyItem[] {
  const items: UncertaintyItem[] = [];
  if (ctx && ctx.missingInformation.length > 0) {
    items.push({
      uncertaintyId: nextId(),
      type: 'MISSING_DATA',
      description: `${ctx.missingInformation.length} missing information item(s) from context.`,
      severity: ctx.missingInformation.some(m => m.severity === 'critical') ? 'CRITICAL' : 'HIGH',
      affectedSourceIds: [ctx.requestId],
      resolvable: true,
      suggestedResolution: 'Resolve missing information gaps.',
    });
  }
  if (decision && decision.requiresMoreData) {
    items.push({
      uncertaintyId: nextId(),
      type: 'MISSING_DATA',
      description: 'Decision engine flagged that more data is required.',
      severity: 'HIGH',
      affectedSourceIds: [decision.decisionResultId],
      resolvable: true,
      suggestedResolution: 'Provide additional data before proceeding.',
    });
  }
  if (plan && plan.status === 'NEEDS_DATA') {
    items.push({
      uncertaintyId: nextId(),
      type: 'MISSING_DATA',
      description: 'Plan requires additional data to be ready.',
      severity: 'HIGH',
      affectedSourceIds: [plan.planId],
      resolvable: true,
      suggestedResolution: 'Connect required data sources.',
    });
  }
  if (plan && plan.graph.nodes.length === 0) {
    items.push({
      uncertaintyId: nextId(),
      type: 'MISSING_DATA',
      description: 'Execution plan contains no nodes.',
      severity: 'HIGH',
      affectedSourceIds: [plan.planId],
      resolvable: true,
      suggestedResolution: 'Regenerate the plan with valid nodes.',
    });
  }
  if (intent && intent.requiresClarification) {
    items.push({
      uncertaintyId: nextId(),
      type: 'AMBIGUOUS_OBJECTIVE',
      description: 'Intent requires clarification.',
      severity: severityFromImpact(intent.impact),
      affectedSourceIds: [intent.intentId],
      resolvable: true,
      suggestedResolution: 'Answer clarification questions.',
    });
  }
  return items;
}
