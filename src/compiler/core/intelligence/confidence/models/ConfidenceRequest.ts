// ─── Confidence request ────────────────────────────────────────────────────────
// Input to the Confidence Engine. References existing engine results rather
// than reinterpreting the original prompt or regenerating artifacts.

import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { RiskLevel } from '../../planning/models/PlanRisk';

export type AssessmentScope =
  | 'CONTEXT_ONLY'
  | 'INTENT_ONLY'
  | 'PLAN_ONLY'
  | 'DECISION_ONLY'
  | 'FULL_PIPELINE';

export interface ConfidenceRequest {
  /** Optional correlation id from the originating request. */
  requestId:                 string;
  organizationId:            string;
  contextResult?:            ContextResult;
  intentResult?:             IntentResult;
  executionPlan?:            ExecutionPlan;
  decisionResult?:          DecisionResult;
  assessmentScope:           AssessmentScope;
  /** Minimum overall score (0–100) for the result to be ACCEPTABLE. */
  minimumConfidenceThreshold: number;
  /** Maximum risk level the organization is willing to accept. */
  riskTolerance:             RiskLevel;
  requestedAt:                string;   // ISO
}
