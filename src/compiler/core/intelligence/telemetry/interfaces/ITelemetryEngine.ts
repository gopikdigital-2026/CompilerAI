// ─── ITelemetryEngine ───────────────────────────────────────────────────────────
// Interface for the telemetry engine that records execution traces.

import type { ExecutionTrace } from '../models/ExecutionTrace';
import type { TelemetryMetrics } from '../models/TelemetryMetrics';
import type { ExplainabilityRecord } from '../models/ExplainabilityRecord';
import type { TelemetryEventPayload } from '../models/TelemetryEventPayload';
import type { IntelligenceStage } from '../../orchestrator/models/CompilerIntelligenceModels';

export interface TelemetryEngineDeps {
  idGenerator: () => string;
  clock:       () => string;
}

export interface ITelemetryEngine {
  readonly id: string;
  /** Start tracking a new pipeline execution. */
  startExecution(executionId: string, requestId: string, organizationId: string): void;
  /** Record a stage start. */
  recordStageStart(stage: IntelligenceStage, engineId?: string): void;
  /** Record a stage completion. */
  recordStageComplete(stage: IntelligenceStage, data: StageCompleteData): void;
  /** Record a stage failure. */
  recordStageFailure(stage: IntelligenceStage, errors: string[]): void;
  /** Record a pipeline-level event (blocked, human review, etc.). */
  recordPipelineEvent(eventType: 'PipelineBlocked' | 'HumanReviewRequested' | 'ConfidenceCalculated' | 'DecisionRejected', data: PipelineEventData): void;
  /** Finalize the execution and return the full trace. */
  finalizeExecution(pipelineStatus: import('../../orchestrator/models/CompilerIntelligenceModels').CompilerIntelligenceStatus, requiresHumanReview: boolean): ExecutionTrace;
  /** Get the current in-progress trace. */
  getCurrentTrace(): ExecutionTrace | null;
  /** Get all finalized traces. */
  getTraces(): ExecutionTrace[];
  /** Compute aggregate metrics across all traces. */
  computeMetrics(): TelemetryMetrics;
  /** Build an explainability record from a trace. */
  explain(trace: ExecutionTrace): ExplainabilityRecord;
  /** Get all emitted events. */
  getEvents(): TelemetryEventPayload[];
}

export interface StageCompleteData {
  resultId?:       string;
  summary:         string;
  warnings?:       string[];
  errors?:         string[];
  confidenceScore?: number;
  riskLevel?:      string;
  estimatedCost?:  number;
  tokensUsed?:     number;
}

export interface PipelineEventData {
  stage?:          IntelligenceStage;
  summary:         string;
  confidenceScore?: number;
  riskLevel?:      string;
  blockers?:       string[];
  warnings?:       string[];
  errors?:         string[];
}
