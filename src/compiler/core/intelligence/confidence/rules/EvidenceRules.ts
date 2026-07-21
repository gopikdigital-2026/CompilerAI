// ─── Evidence rules ────────────────────────────────────────────────────────────
// Derives and scores evidence from existing engine results. Never invents
// evidence — only items backed by references already present.

import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { EvidenceItem, EvidenceKind } from '../models/EvidenceItem';

let counter = 0;
function nextId(): string {
  counter += 1;
  return `ev-${counter.toString().padStart(4, '0')}`;
}

function qualityScore(parts: number[]): number {
  if (parts.length === 0) return 0;
  const sum = parts.reduce((a, b) => a + b, 0);
  return Math.round(sum / parts.length);
}

export function collectContextEvidence(ctx: ContextResult): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  for (const s of ctx.recommendedSources) {
    const reliability = s.available ? 80 : 30;
    const relevance = s.relevance;
    const freshness = 70;
    const consistency = 75;
    const coverage = 60;
    const traceability = 85;
    items.push({
      evidenceId: nextId(),
      kind: 'CONTEXT_SOURCE' as EvidenceKind,
      sourceId: s.id,
      description: `Context source: ${s.label} (${s.kind}).`,
      relevance, reliability, freshness, consistency, coverage, traceability,
      qualityScore: qualityScore([relevance, reliability, freshness, consistency, coverage, traceability]),
    });
  }
  for (const m of ctx.relevantMemory) {
    items.push({
      evidenceId: nextId(),
      kind: 'CONTEXT_SOURCE' as EvidenceKind,
      sourceId: m.key,
      description: `Relevant memory: ${m.key} = ${m.value}`,
      relevance: 70, reliability: 65, freshness: 50, consistency: 70, coverage: 40, traceability: 60,
      qualityScore: qualityScore([70, 65, 50, 70, 40, 60]),
    });
  }
  return items;
}

export function collectIntentEvidence(intent: IntentResult): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  for (const r of intent.classificationReasons) {
    items.push({
      evidenceId: nextId(),
      kind: 'INTENT_REASON' as EvidenceKind,
      sourceId: intent.intentId,
      description: `Classification reason: ${r}`,
      relevance: 85, reliability: 80, freshness: 90, consistency: 85, coverage: 70, traceability: 90,
      qualityScore: qualityScore([85, 80, 90, 85, 70, 90]),
    });
  }
  return items;
}

export function collectPlanEvidence(plan: ExecutionPlan): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  for (const n of plan.graph.nodes) {
    items.push({
      evidenceId: nextId(),
      kind: 'PLAN_NODE' as EvidenceKind,
      sourceId: n.nodeId,
      description: `Plan node: ${n.title} (${n.type}).`,
      relevance: 75, reliability: 70, freshness: 80, consistency: 75, coverage: 65, traceability: 85,
      qualityScore: qualityScore([75, 70, 80, 75, 65, 85]),
    });
  }
  for (const r of plan.risks) {
    items.push({
      evidenceId: nextId(),
      kind: 'PLAN_RISK' as EvidenceKind,
      sourceId: plan.planId,
      description: `Risk: ${r.description} (${r.level}).`,
      relevance: 80, reliability: 75, freshness: 75, consistency: 70, coverage: 60, traceability: 80,
      qualityScore: qualityScore([80, 75, 75, 70, 60, 80]),
    });
  }
  for (const a of plan.assumptions) {
    items.push({
      evidenceId: nextId(),
      kind: 'ASSUMPTION' as EvidenceKind,
      sourceId: plan.planId,
      description: `Plan assumption: ${a}`,
      relevance: 60, reliability: 40, freshness: 70, consistency: 50, coverage: 40, traceability: 60,
      qualityScore: qualityScore([60, 40, 70, 50, 40, 60]),
    });
  }
  return items;
}

export function collectDecisionEvidence(decision: DecisionResult): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  for (const d of decision.decisions) {
    for (const alt of d.alternatives) {
      items.push({
        evidenceId: nextId(),
        kind: 'DECISION_ALTERNATIVE' as EvidenceKind,
        sourceId: alt.alternativeId,
        description: `Alternative: ${alt.title} for decision "${d.title}".`,
        relevance: 80, reliability: 70, freshness: 75, consistency: 65, coverage: 60, traceability: 75,
        qualityScore: qualityScore([80, 70, 75, 65, 60, 75]),
      });
      for (const ev of alt.evaluations) {
        for (const c of ev.criteria) {
          items.push({
            evidenceId: nextId(),
            kind: 'DECISION_CRITERION' as EvidenceKind,
            sourceId: d.decisionId,
            description: `Criterion: ${c.kind} (score ${c.score}) for ${alt.title}.`,
            relevance: 75, reliability: 70, freshness: 80, consistency: 70, coverage: 55, traceability: 80,
            qualityScore: qualityScore([75, 70, 80, 70, 55, 80]),
          });
        }
      }
    }
  }
  for (const ap of decision.humanApprovalRequirements) {
    items.push({
      evidenceId: nextId(),
      kind: 'APPROVAL_REQUIREMENT' as EvidenceKind,
      sourceId: ap.nodeId,
      description: `Approval required: ${ap.rationale} (${ap.reason}).`,
      relevance: 85, reliability: 90, freshness: 85, consistency: 80, coverage: 70, traceability: 90,
      qualityScore: qualityScore([85, 90, 85, 80, 70, 90]),
    });
  }
  return items;
}

export function detectMissingEvidence(
  ctx: ContextResult | undefined,
  intent: IntentResult | undefined,
  plan: ExecutionPlan | undefined,
  decision: DecisionResult | undefined,
): string[] {
  const missing: string[] = [];
  if (ctx && ctx.recommendedSources.length === 0 && ctx.relevantMemory.length === 0) {
    missing.push('No context sources or memory references provided.');
  }
  if (intent && intent.classificationReasons.length === 0) {
    missing.push('No classification reasons for intent.');
  }
  if (plan && plan.graph.nodes.length === 0) {
    missing.push('Execution plan contains no nodes.');
  }
  if (decision && decision.decisions.length === 0) {
    missing.push('No decisions extracted from the plan.');
  }
  if (decision && decision.decisions.length > 0) {
    const noAlts = decision.decisions.filter(d => d.alternatives.length === 0);
    if (noAlts.length > 0) {
      missing.push(`${noAlts.length} decision(s) have no alternatives to evaluate.`);
    }
  }
  if (decision && decision.selectedStrategy === null) {
    missing.push('No selected strategy in decision result.');
  }
  return missing;
}
