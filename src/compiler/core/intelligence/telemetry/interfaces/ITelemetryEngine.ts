// ─── ITelemetryEngine ───────────────────────────────────────────────────────────
// Interface for the telemetry engine that records execution traces and emits events.

import type { ExecutionTrace } from '../models/ExecutionTrace';
import type { TelemetryMetrics } from '../models/TelemetryMetrics';
import type { ExplainabilityRecord } from '../models/ExplainabilityRecord';
import type { PerformanceSnapshot } from '../models/PerformanceSnapshot';
import type { TelemetryEvent } from '../events/TelemetryEvent';
import type { IntelligenceStage, CompilerIntelligenceStatus } from '../../orchestrator/models/CompilerIntelligenceModels';
import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { ConfidenceResult } from '../../confidence/models/ConfidenceResult';

export interface TelemetryEngineDeps {
  idGenerator: () => string;
  clock:       () => string;
}

/** Data passed when a stage completes. */
export interface StageCompleteData {
  resultId?:          string;
  summary:            string;
  warnings?:          string[];
  errors?:            string[];
  confidenceScore?:   number;
  riskLevel?:         string;
  estimatedCost?:     number;
  tokensUsed?:        number;
  memoryUsageMb?:     number;
  modelUsed?:         string;
  decisionsEvaluated?: number;
}

/** Data passed when a pipeline-level event occurs. */
export interface PipelineEventData {
  stage?:            IntelligenceStage;
  summary:           string;
  confidenceScore?:  number;
  riskLevel?:        string;
  blockers?:         string[];
  warnings?:         string[];
  errors?:           string[];
  reason?:           string;
  rejectedDecisionIds?: string[];
}

/** Pipeline results supplied at finalization for explainability. */
export interface PipelineResults {
  contextResult?:    ContextResult | null;
  intentResult?:     IntentResult | null;
  executionPlan?:    ExecutionPlan | null;
  decisionResult?:   DecisionResult | null;
  confidenceResult?: ConfidenceResult | null;
}

export interface ITelemetryEngine {
  readonly id: string;
  startExecution(executionId: string, requestId: string, organizationId: string): void;
  recordStageStart(stage: IntelligenceStage, engineId?: string): void;
  recordStageComplete(stage: IntelligenceStage, data: StageCompleteData): void;
  recordStageFailure(stage: IntelligenceStage, errors: string[]): void;
  recordPipelineEvent(eventType: 'PipelineBlocked' | 'HumanReviewRequested' | 'ConfidenceCalculated' | 'DecisionRejected', data: PipelineEventData): void;
  finalizeExecution(pipelineStatus: CompilerIntelligenceStatus, requiresHumanReview: boolean, results?: PipelineResults): ExecutionTrace;
  getCurrentTrace(): ExecutionTrace | null;
  getTraces(): ExecutionTrace[];
  computeMetrics(): TelemetryMetrics;
  explain(trace?: ExecutionTrace, results?: PipelineResults): ExplainabilityRecord;
  getEvents(): TelemetryEvent[];
  getPerformanceSnapshots(): PerformanceSnapshot[];
}
