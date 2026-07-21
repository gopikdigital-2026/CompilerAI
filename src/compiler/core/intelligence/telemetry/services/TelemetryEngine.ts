// ─── TelemetryEngine ────────────────────────────────────────────────────────────
// Records execution traces, emits telemetry events, computes metrics, and
// produces explainability records. Designed for future OpenTelemetry export.

import type { ExecutionTrace } from '../models/ExecutionTrace';
import type { StageTrace } from '../models/StageTrace';
import type { TelemetryMetrics } from '../models/TelemetryMetrics';
import type { ExplainabilityRecord } from '../models/ExplainabilityRecord';
import type { PerformanceSnapshot } from '../models/PerformanceSnapshot';
import type { TelemetryEvent, TelemetryEventType, TelemetryStageStatus } from '../events/TelemetryEvent';
import type { StageStartedEvent } from '../events/StageStartedEvent';
import type { StageCompletedEvent } from '../events/StageCompletedEvent';
import type { StageFailedEvent } from '../events/StageFailedEvent';
import type { PipelineBlockedEvent } from '../events/PipelineBlockedEvent';
import type { HumanReviewRequestedEvent } from '../events/HumanReviewRequestedEvent';
import type { ConfidenceCalculatedEvent } from '../events/ConfidenceCalculatedEvent';
import type { DecisionRejectedEvent } from '../events/DecisionRejectedEvent';
import type { IntelligenceStage, CompilerIntelligenceStatus } from '../../orchestrator/models/CompilerIntelligenceModels';
import type { ITelemetryEngine, TelemetryEngineDeps, StageCompleteData, PipelineEventData, PipelineResults } from '../interfaces/ITelemetryEngine';
import type { ITelemetryEventBus } from '../interfaces/ITelemetryEventBus';
import type { IMetricsCollector } from '../interfaces/IMetricsCollector';
import { TelemetryEventBus } from './TelemetryEventBus';
import { MetricsCollector } from './MetricsCollector';
import { TraceBuilder } from './TraceBuilder';
import { ExplainabilityBuilder } from './ExplainabilityBuilder';
import { TelemetryNotInitializedError } from '../errors/TelemetryError';

const VERSION = '1.0.0';

export class TelemetryEngine implements ITelemetryEngine {
  readonly id = 'telemetry-engine-v1';

  private readonly eventBus: ITelemetryEventBus;
  private readonly metricsCollector: IMetricsCollector;
  private readonly traceBuilder: TraceBuilder;
  private readonly explainabilityBuilder: ExplainabilityBuilder;

  private current: ExecutionTrace | null = null;
  private currentStages: Map<IntelligenceStage, StageTrace> = new Map();
  private stageStartTimes: Map<IntelligenceStage, string> = new Map();
  private readonly finalizedTraces: ExecutionTrace[] = [];

  constructor(
    private readonly deps: TelemetryEngineDeps,
    eventBus?: ITelemetryEventBus,
    metricsCollector?: IMetricsCollector,
  ) {
    this.eventBus = eventBus ?? new TelemetryEventBus();
    this.metricsCollector = metricsCollector ?? new MetricsCollector(deps.idGenerator, deps.clock);
    this.traceBuilder = new TraceBuilder();
    this.explainabilityBuilder = new ExplainabilityBuilder(deps);
  }

  startExecution(executionId: string, requestId: string, organizationId: string): void {
    this.current = {
      traceId: this.deps.idGenerator(),
      executionId, requestId, organizationId,
      pipelineStatus: 'COMPLETED',
      startedAt: this.deps.clock(),
      completedAt: null,
      totalDurationMs: null,
      stages: [],
      totalWarnings: 0, totalErrors: 0, totalBlockers: 0,
      finalConfidence: null, finalRiskLevel: null,
      estimatedTotalCost: null, totalTokensUsed: null,
      totalDecisionsEvaluated: null,
      requiresHumanReview: false,
      currentStage: 'CONTEXT',
      version: VERSION,
    };
    this.currentStages.clear();
    this.stageStartTimes.clear();

    this.emitEvent('PipelineStarted', { summary: `Pipeline started for ${requestId}.` });
  }

  recordStageStart(stage: IntelligenceStage, engineId?: string): void {
    this.ensureActive();
    const now = this.deps.clock();
    this.stageStartTimes.set(stage, now);
    this.currentStages.set(stage, {
      stageId: this.deps.idGenerator(), stage, status: 'RUNNING',
      startedAt: now, completedAt: null, durationMs: null,
      warnings: [], errors: [], confidenceScore: null, riskLevel: null,
      estimatedCost: null, memoryUsageMb: null, tokensUsed: null,
      modelUsed: null, decisionsEvaluated: null,
      engineId: engineId ?? null, resultId: null, summary: '',
    });
    if (this.current) this.current.currentStage = stage;

    this.emitEvent('StageStarted', { stage, stageStatus: 'RUNNING', summary: `Stage ${stage} started.`, engineId });
  }

  recordStageComplete(stage: IntelligenceStage, data: StageCompleteData): void {
    this.ensureActive();
    const st = this.currentStages.get(stage);
    if (!st) return;
    const now = this.deps.clock();
    const startTime = this.stageStartTimes.get(stage);
    const durationMs = startTime ? this.traceBuilder.computeDurationMs(startTime, now) : 0;

    st.status = 'COMPLETED';
    st.completedAt = now;
    st.durationMs = durationMs;
    st.summary = data.summary;
    st.warnings = data.warnings ?? [];
    st.errors = data.errors ?? [];
    st.confidenceScore = data.confidenceScore ?? null;
    st.riskLevel = data.riskLevel ?? null;
    st.estimatedCost = data.estimatedCost ?? null;
    st.tokensUsed = data.tokensUsed ?? null;
    st.memoryUsageMb = data.memoryUsageMb ?? null;
    st.modelUsed = data.modelUsed ?? null;
    st.decisionsEvaluated = data.decisionsEvaluated ?? null;
    st.resultId = data.resultId ?? null;

    this.emitEvent('StageCompleted', {
      stage, stageStatus: 'COMPLETED', durationMs, summary: data.summary,
      confidenceScore: data.confidenceScore ?? null, riskLevel: data.riskLevel ?? null,
      estimatedCost: data.estimatedCost ?? null, tokensUsed: data.tokensUsed ?? null,
      resultId: data.resultId, warnings: data.warnings, errors: data.errors,
    });
  }

  recordStageFailure(stage: IntelligenceStage, errors: string[]): void {
    this.ensureActive();
    const st = this.currentStages.get(stage);
    if (!st) return;
    const now = this.deps.clock();
    const startTime = this.stageStartTimes.get(stage);
    const durationMs = startTime ? this.traceBuilder.computeDurationMs(startTime, now) : 0;

    st.status = 'FAILED';
    st.completedAt = now;
    st.durationMs = durationMs;
    st.errors = errors;
    st.summary = `Stage ${stage} failed.`;

    this.emitEvent('StageFailed', {
      stage, stageStatus: 'FAILED', durationMs, summary: `Stage ${stage} failed.`, errors,
    });
  }

  recordPipelineEvent(
    eventType: 'PipelineBlocked' | 'HumanReviewRequested' | 'ConfidenceCalculated' | 'DecisionRejected',
    data: PipelineEventData,
  ): void {
    this.ensureActive();
    this.emitEvent(eventType, {
      stage: data.stage,
      summary: data.summary,
      confidenceScore: data.confidenceScore ?? null,
      riskLevel: data.riskLevel ?? null,
      blockers: data.blockers,
      warnings: data.warnings,
      errors: data.errors,
      reason: data.reason,
      rejectedDecisionIds: data.rejectedDecisionIds,
      requiresHumanReview: eventType === 'HumanReviewRequested',
    });
  }

  finalizeExecution(pipelineStatus: CompilerIntelligenceStatus, requiresHumanReview: boolean, _results?: PipelineResults): ExecutionTrace {
    this.ensureActive();
    const now = this.deps.clock();
    const trace = this.current!;
    const stages = Array.from(this.currentStages.values());

    const finalTrace = this.traceBuilder.buildExecutionTrace(
      trace.traceId, trace.executionId, trace.requestId, trace.organizationId,
      pipelineStatus, trace.startedAt, now, stages, requiresHumanReview,
      trace.currentStage,
    );

    this.emitEvent('PipelineCompleted', {
      pipelineStatus, durationMs: finalTrace.totalDurationMs,
      summary: `Pipeline ${pipelineStatus} in ${finalTrace.totalDurationMs}ms.`,
      confidenceScore: finalTrace.finalConfidence, requiresHumanReview,
    });

    this.metricsCollector.collect(finalTrace);
    this.finalizedTraces.push(finalTrace);
    this.current = null;
    this.currentStages.clear();
    this.stageStartTimes.clear();

    return finalTrace;
  }

  getCurrentTrace(): ExecutionTrace | null {
    return this.current;
  }

  getTraces(): ExecutionTrace[] {
    return [...this.finalizedTraces];
  }

  computeMetrics(): TelemetryMetrics {
    return this.metricsCollector.compute();
  }

  explain(trace?: ExecutionTrace, results?: PipelineResults): ExplainabilityRecord {
    const target = trace ?? this.finalizedTraces[this.finalizedTraces.length - 1];
    if (!target) throw new TelemetryNotInitializedError('No trace available to explain.');
    return this.explainabilityBuilder.build(target, results);
  }

  getEvents(): TelemetryEvent[] {
    return this.eventBus.getEvents();
  }

  getPerformanceSnapshots(): PerformanceSnapshot[] {
    return this.metricsCollector.getSnapshots();
  }

  getEventBus(): ITelemetryEventBus {
    return this.eventBus;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private ensureActive(): void {
    if (!this.current) throw new TelemetryNotInitializedError();
  }

  private emitEvent(
    eventType: TelemetryEventType,
    options: {
      stage?:             IntelligenceStage;
      stageStatus?:       TelemetryStageStatus;
      pipelineStatus?:    CompilerIntelligenceStatus;
      durationMs?:        number | null;
      confidenceScore?:   number | null;
      riskLevel?:         string | null;
      estimatedCost?:     number | null;
      tokensUsed?:        number | null;
      warnings?:          string[];
      errors?:            string[];
      blockers?:          string[];
      summary?:           string;
      requiresHumanReview?: boolean;
      reason?:            string;
      rejectedDecisionIds?: string[];
      engineId?:          string | null;
      resultId?:          string;
    } = {},
  ): void {
    if (!this.current) return;
    const base = {
      eventId: this.deps.idGenerator(),
      eventType,
      executionId: this.current.executionId,
      requestId: this.current.requestId,
      organizationId: this.current.organizationId,
      timestamp: this.deps.clock(),
      summary: options.summary ?? '',
      metadata: {} as Record<string, unknown>,
    };

    let event: TelemetryEvent;
    switch (eventType) {
      case 'StageStarted':
        event = { ...base, eventType: 'StageStarted', stage: options.stage!, engineId: options.engineId ?? null } as StageStartedEvent;
        break;
      case 'StageCompleted':
        event = { ...base, eventType: 'StageCompleted', stage: options.stage!, durationMs: options.durationMs ?? 0,
          confidenceScore: options.confidenceScore, riskLevel: options.riskLevel, estimatedCost: options.estimatedCost,
          tokensUsed: options.tokensUsed, resultId: options.resultId ?? null,
          warnings: options.warnings ?? [], errors: options.errors ?? [] } as StageCompletedEvent;
        break;
      case 'StageFailed':
        event = { ...base, eventType: 'StageFailed', stage: options.stage!, durationMs: options.durationMs ?? 0,
          errors: options.errors ?? [] } as StageFailedEvent;
        break;
      case 'PipelineBlocked':
        event = { ...base, eventType: 'PipelineBlocked', stage: options.stage ?? null,
          blockers: options.blockers ?? [] } as PipelineBlockedEvent;
        break;
      case 'HumanReviewRequested':
        event = { ...base, eventType: 'HumanReviewRequested', stage: options.stage ?? null,
          reason: options.reason ?? options.summary ?? '' } as HumanReviewRequestedEvent;
        break;
      case 'ConfidenceCalculated':
        event = { ...base, eventType: 'ConfidenceCalculated', stage: options.stage!,
          confidenceScore: options.confidenceScore ?? 0, riskLevel: options.riskLevel } as ConfidenceCalculatedEvent;
        break;
      case 'DecisionRejected':
        event = { ...base, eventType: 'DecisionRejected', stage: options.stage!,
          reason: options.reason ?? options.summary ?? '',
          rejectedDecisionIds: options.rejectedDecisionIds ?? [] } as DecisionRejectedEvent;
        break;
      default:
        event = { ...base };
    }

    this.eventBus.emit(event);
  }
}
