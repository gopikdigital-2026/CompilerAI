// ─── Orchestrator models ────────────────────────────────────────────────────────
// Models for the Compiler Intelligence Orchestrator.

import type { ContextResult } from '../../models/ContextResult';
import type { ContextRequest } from '../../models/ContextRequest';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { ConfidenceResult } from '../../confidence/models/ConfidenceResult';
import type { RiskLevel } from '../../planning/models/PlanRisk';
import type { EnterpriseMemorySnapshot } from '../../interfaces/IContextEnricher';

/** Intelligence pipeline stages executed in order. */
export type IntelligenceStage =
  | 'CONTEXT'
  | 'INTENT'
  | 'PLANNING'
  | 'DECISION'
  | 'CONFIDENCE';

export const PIPELINE_STAGES: readonly IntelligenceStage[] = [
  'CONTEXT', 'INTENT', 'PLANNING', 'DECISION', 'CONFIDENCE',
] as const;

/** Overall status of the intelligence pipeline. */
export type CompilerIntelligenceStatus =
  | 'COMPLETED'
  | 'NEEDS_DATA'
  | 'NEEDS_CLARIFICATION'
  | 'REQUIRES_APPROVAL'
  | 'BLOCKED'
  | 'FAILED';

export const COMPILER_INTELLIGENCE_STATUSES: readonly CompilerIntelligenceStatus[] = [
  'COMPLETED', 'NEEDS_DATA', 'NEEDS_CLARIFICATION',
  'REQUIRES_APPROVAL', 'BLOCKED', 'FAILED',
] as const;

/** A single trace entry recording what happened at a pipeline stage. */
export interface TraceEntry {
  stage:         IntelligenceStage;
  startedAt:     string;   // ISO
  completedAt:   string;   // ISO
  success:       boolean;
  /** Safe, non-sensitive summary of what occurred. */
  summary:       string;
  /** Engine id that produced the result, when applicable. */
  engineId?:     string;
  /** Result id produced by this stage, for correlation. */
  resultId?:     string;
}

/** The final result of running the full intelligence pipeline. */
export interface CompilerIntelligenceResult {
  executionId:           string;
  requestId:             string;
  organizationId:       string;
  contextResult:        ContextResult | null;
  intentResult:         IntentResult | null;
  executionPlan:        ExecutionPlan | null;
  decisionResult:       DecisionResult | null;
  confidenceResult:     ConfidenceResult | null;
  currentStage:         IntelligenceStage;
  status:               CompilerIntelligenceStatus;
  trace:                TraceEntry[];
  warnings:             string[];
  errors:               string[];
  blockers:             string[];
  requiresHumanReview:  boolean;
  startedAt:            string;   // ISO
  completedAt:          string;   // ISO
  version:              string;
}

/** Input to the orchestrator. */
export interface CompilerIntelligenceRequest {
  contextRequest:    ContextRequest;
  memory:            EnterpriseMemorySnapshot;
  riskTolerance:     RiskLevel;
  minimumConfidenceThreshold: number;
  /** Stage to resume from (skips earlier stages). Requires pre-populated results. */
  resumeFrom?:        IntelligenceStage;
  /** Pre-existing results when resuming. */
  existingResults?:  Partial<Pick<CompilerIntelligenceResult, 'contextResult' | 'intentResult' | 'executionPlan' | 'decisionResult'>>;
}

// Re-export for convenience — avoids a second import at call sites.
export type { EnterpriseMemorySnapshot } from '../../interfaces/IContextEnricher';
