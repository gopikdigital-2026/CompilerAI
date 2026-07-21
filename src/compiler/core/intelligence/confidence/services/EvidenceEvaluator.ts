// ─── Evidence evaluator ────────────────────────────────────────────────────────
// Collects evidence from existing engine results and identifies missing evidence.

import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { EvidenceItem } from '../models/EvidenceItem';
import type { IEvidenceEvaluator } from '../interfaces/IEvidenceEvaluator';
import {
  collectContextEvidence,
  collectIntentEvidence,
  collectPlanEvidence,
  collectDecisionEvidence,
  detectMissingEvidence,
} from '../rules/EvidenceRules';

export class EvidenceEvaluator implements IEvidenceEvaluator {
  collect(request: ConfidenceRequest): EvidenceItem[] {
    const items: EvidenceItem[] = [];
    if (request.contextResult) {
      items.push(...collectContextEvidence(request.contextResult));
    }
    if (request.intentResult) {
      items.push(...collectIntentEvidence(request.intentResult));
    }
    if (request.executionPlan) {
      items.push(...collectPlanEvidence(request.executionPlan));
    }
    if (request.decisionResult) {
      items.push(...collectDecisionEvidence(request.decisionResult));
    }
    return items;
  }

  missingEvidence(request: ConfidenceRequest): string[] {
    return detectMissingEvidence(
      request.contextResult, request.intentResult,
      request.executionPlan, request.decisionResult,
    );
  }
}
