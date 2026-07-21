// ─── Uncertainty analyzer ──────────────────────────────────────────────────────
// Detects all uncertainty sources across the supplied engine results.

import type { ConfidenceRequest } from '../models/ConfidenceRequest';
import type { UncertaintyItem } from '../models/UncertaintyItem';
import type { IUncertaintyAnalyzer } from '../interfaces/IUncertaintyAnalyzer';
import {
  detectContextUncertainties,
  detectIntentUncertainties,
  detectPlanUncertainties,
  detectDecisionUncertainties,
  detectMissingDataUncertainties,
} from '../rules/UncertaintyRules';

export class UncertaintyAnalyzer implements IUncertaintyAnalyzer {
  analyze(request: ConfidenceRequest): UncertaintyItem[] {
    const items: UncertaintyItem[] = [];
    if (request.contextResult) {
      items.push(...detectContextUncertainties(request.contextResult));
    }
    if (request.intentResult) {
      items.push(...detectIntentUncertainties(request.intentResult));
    }
    if (request.executionPlan) {
      items.push(...detectPlanUncertainties(request.executionPlan));
    }
    if (request.decisionResult) {
      items.push(...detectDecisionUncertainties(request.decisionResult));
    }
    items.push(...detectMissingDataUncertainties(
      request.contextResult, request.intentResult,
      request.executionPlan, request.decisionResult,
    ));
    return items;
  }
}
