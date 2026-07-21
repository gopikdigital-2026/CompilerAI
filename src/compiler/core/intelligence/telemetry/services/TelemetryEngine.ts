// ─── TelemetryEngine ────────────────────────────────────────────────────────────
// Records execution traces, emits telemetry events, computes metrics, and
// produces explainability records.

import type { ExecutionTrace } from '../models/ExecutionTrace';
import type { StageTrace } from '../models/StageTrace';
import type { TelemetryMetrics, StageMetric } from '../models/TelemetryMetrics';
import type { ExplainabilityRecord } from '../models/ExplainabilityRecord';
import type { TelemetryEventPayload } from '../models/TelemetryEventPayload';
import type { TelemetryStageStatus } from '../models/TelemetryEvent';
import type { IntelligenceStage, CompilerIntelligenceStatus } from '../../orchestrator/models/CompilerIntelligenceModels';
import type { ITelemetryEngine, TelemetryEngineDeps, StageCompleteData, PipelineEventData } from '../interfaces/ITelemetryEngine';
import type { ITelemetryEventBus } from '../interfaces/ITelemetryEventBus';
import { TelemetryEventBus } from './TelemetryEventBus';
import { buildEvent } from '../events/TelemetryEventFactory';
import { buildExplainabilityFromTrace } from '../models/ExplainabilityRecord';
import { TelemetryNotInitializedError } from '../errors/TelemetryErrors';

const VERSION = '1.0.0';

export class TelemetryEngine implements ITelemetryEngine {
  readonly id = 'telemetry-engine-v1';

  private readonly eventBus: ITelemetryEventBus;
  private current: ExecutionTrace | null = null;
  private currentStages: Map<IntelligenceStage, StageTrace> = new Map();
  private stageStartTimes: Map<IntelligenceStage, string> = new Map();
  private readonly finalizedTraces: ExecutionTrace[] = [];

  constructor(
    private readonly deps: TelemetryEngineDeps,
    eventBus?: ITelemetryEventBus,
  ) {
    this.eventBus = eventBus ?? new TelemetryEventBus();
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
      totalWarnings: 0,
      totalErrors: 0,
      totalBlockers: 0,
      finalConfidence: null,
      finalRiskLevel: null,
      estimatedTotalCost: null,
      totalTokensUsed: null,
      requiresHumanReview: false,
      currentStage: 'CONTEXT',
      version: VERSION,
    };
    this.currentStages.clear();
    this.stageStartTimes.clear();

    this.emitEvent('PipelineStarted', {
      summary: `Pipeline started for ${requestId}.`,
    });
  }

  recordStageStart(stage: IntelligenceStage, engineId?: string): void {
    this.ensureActive();
    const now = this.deps.clock();
    this.stageStartTimes.set(stage, now);
    const stageTrace: StageTrace = {
      stageId: this.deps.idGenerator(),
      stage,
      status: 'RUNNING',
      startedAt: now,
      completedAt: null,
      durationMs: null,
      warnings: [],
      errors: [],
      confidenceScore: null,
      riskLevel: null,
      estimatedCost: null,
      tokensUsed: null,
      engineId: engineId ?? null,
      resultId: null,
      summary: '',
    };
    this.currentStages.set(stage, stageTrace);
    if (this.current) this.current.currentStage = stage;

    this.emitEvent('StageStarted', {
      stage,
      stageStatus: 'RUNNING',
      summary: `Stage ${stage} started.`,
    });
  }

  recordStageComplete(stage: IntelligenceStage, data: StageCompleteData): void {
    this.ensureActive();
    const stageTrace = this.currentStages.get(stage);
    if (!stageTrace) return;
    const now = this.deps.clock();
    const startTime = this.stageStartTimes.get(stage);
    const durationMs = startTime ? Math.max(0, new Date(now).getTime() - new Date(startTime).getTime()) : null;

    stageTrace.status = 'COMPLETED';
    stageTrace.completedAt = now;
    stageTrace.durationMs = durationMs;
    stageTrace.summary = data.summary;
    stageTrace.warnings = data.warnings ?? [];
    stageTrace.errors = data.errors ?? [];
    stageTrace.confidenceScore = data.confidenceScore ?? null;
    stageTrace.riskLevel = data.riskLevel ?? null;
    stageTrace.estimatedCost = data.estimatedCost ?? null;
    stageTrace.tokensUsed = data.tokensUsed ?? null;
    stageTrace.resultId = data.resultId ?? null;

    this.emitEvent('StageCompleted', {
      stage,
      stageStatus: 'COMPLETED',
      durationMs,
      summary: data.summary,
      confidenceScore: data.confidenceScore ?? null,
      riskLevel: data.riskLevel ?? null,
      estimatedCost: data.estimatedCost ?? null,
      tokensUsed: data.tokensUsed ?? null,
      warnings: data.warnings,
      errors: data.errors,
      resultId: data.resultId,
    });
  }

  recordStageFailure(stage: IntelligenceStage, errors: string[]): void {
    this.ensureActive();
    const stageTrace = this.currentStages.get(stage);
    if (!stageTrace) return;
    const now = this.deps.clock();
    const startTime = this.stageStartTimes.get(stage);
    const durationMs = startTime ? Math.max(0, new Date(now).getTime() - new Date(startTime).getTime()) : null;

    stageTrace.status = 'FAILED';
    stageTrace.completedAt = now;
    stageTrace.durationMs = durationMs;
    stageTrace.errors = errors;
    stageTrace.summary = `Stage ${stage} failed.`;

    this.emitEvent('StageFailed', {
      stage,
      stageStatus: 'FAILED',
      durationMs,
      summary: `Stage ${stage} failed.`,
      errors,
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
      requiresHumanReview: eventType === 'HumanReviewRequested',
    });
  }

  finalizeExecution(pipelineStatus: CompilerIntelligenceStatus, requiresHumanReview: boolean): ExecutionTrace {
    this.ensureActive();
    const now = this.deps.clock();
    const trace = this.current!;
    const startedMs = new Date(trace.startedAt).getTime();
    trace.completedAt = now;
    trace.totalDurationMs = Math.max(0, new Date(now).getTime() - startedMs);
    trace.pipelineStatus = pipelineStatus;
    trace.requiresHumanReview = requiresHumanReview;
    trace.stages = Array.from(this.currentStages.values());
    trace.totalWarnings = trace.stages.reduce((s, st) => s + st.warnings.length, 0);
    trace.totalErrors = trace.stages.reduce((s, st) => s + st.errors.length, 0);

    // Find final confidence from the last stage that has it
    for (const s of trace.stages) {
      if (s.confidenceScore !== null) trace.finalConfidence = s.confidenceScore;
      if (s.riskLevel !== null) trace.finalRiskLevel = s.riskLevel;
      if (s.estimatedCost !== null) trace.estimatedTotalCost = (trace.estimatedTotalCost ?? 0) + s.estimatedCost;
      if (s.tokensUsed !== null) trace.totalTokensUsed = (trace.totalTokensUsed ?? 0) + s.tokensUsed;
    }

    trace.totalBlockers = pipelineStatus === 'BLOCKED' ? 1 : 0;

    this.emitEvent('PipelineCompleted', {
      pipelineStatus,
      durationMs: trace.totalDurationMs,
      summary: `Pipeline ${pipelineStatus} in ${trace.totalDurationMs}ms.`,
      confidenceScore: trace.finalConfidence,
      requiresHumanReview,
    });

    this.finalizedTraces.push(trace);
    this.current = null;
    this.currentStages.clear();
    this.stageStartTimes.clear();

    return trace;
  }

  getCurrentTrace(): ExecutionTrace | null {
    return this.current;
  }

  getTraces(): ExecutionTrace[] {
    return [...this.finalizedTraces];
  }

  computeMetrics(): TelemetryMetrics {
    const traces = this.finalizedTraces;
    if (traces.length === 0) {
      return {
        totalExecutions: 0, completedExecutions: 0, blockedExecutions: 0,
        failedExecutions: 0, humanReviewExecutions: 0,
        averageDurationMs: null, averageConfidence: null, averageCost: null,
        totalTokensUsed: 0, stageMetrics: {},
      };
    }

    const stageMap: Record<string, { durations: number[]; confidences: number[]; failures: number; blocks: number; count: number }> = {};
    for (const t of traces) {
      for (const s of t.stages) {
        if (!stageMap[s.stage]) stageMap[s.stage] = { durations: [], confidences: [], failures: 0, blocks: 0, count: 0 };
        stageMap[s.stage].count++;
        if (s.durationMs !== null) stageMap[s.stage].durations.push(s.durationMs);
        if (s.confidenceScore !== null) stageMap[s.stage].confidences.push(s.confidenceScore);
        if (s.status === 'FAILED') stageMap[s.stage].failures++;
        if (s.status === 'BLOCKED') stageMap[s.stage].blocks++;
      }
    }

    const stageMetrics: Record<string, StageMetric> = {};
    for (const [stage, m] of Object.entries(stageMap)) {
      stageMetrics[stage] = {
        stage,
        executions: m.count,
        averageDurationMs: m.durations.length > 0 ? Math.round(m.durations.reduce((a, b) => a + b, 0) / m.durations.length) : null,
        averageConfidence: m.confidences.length > 0 ? Math.round(m.confidences.reduce((a, b) => a + b, 0) / m.confidences.length) : null,
        failureRate: m.count > 0 ? m.failures / m.count : 0,
        blockRate: m.count > 0 ? m.blocks / m.count : 0,
      };
    }

    const durations = traces.map(t => t.totalDurationMs).filter((d): d is number => d !== null);
    const confidences = traces.map(t => t.finalConfidence).filter((c): c is number => c !== null);
    const costs = traces.map(t => t.estimatedTotalCost).filter((c): c is number => c !== null);

    return {
      totalExecutions: traces.length,
      completedExecutions: traces.filter(t => t.pipelineStatus === 'COMPLETED').length,
      blockedExecutions: traces.filter(t => t.pipelineStatus === 'BLOCKED').length,
      failedExecutions: traces.filter(t => t.pipelineStatus === 'FAILED').length,
      humanReviewExecutions: traces.filter(t => t.requiresHumanReview).length,
      averageDurationMs: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : null,
      averageConfidence: confidences.length > 0 ? Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length) : null,
      averageCost: costs.length > 0 ? Math.round(costs.reduce((a, b) => a + b, 0) / costs.length) : null,
      totalTokensUsed: traces.reduce((s, t) => s + (t.totalTokensUsed ?? 0), 0),
      stageMetrics,
    };
  }

  explain(trace: ExecutionTrace): ExplainabilityRecord {
    return buildExplainabilityFromTrace(trace, this.deps.idGenerator, this.deps.clock);
  }

  getEvents(): TelemetryEventPayload[] {
    return this.eventBus.getEvents();
  }

  getEventBus(): ITelemetryEventBus {
    return this.eventBus;
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private ensureActive(): void {
    if (!this.current) throw new TelemetryNotInitializedError();
  }

  private emitEvent(
    eventType: TelemetryEventPayload['eventType'],
    options: {
      stage?: IntelligenceStage;
      stageStatus?: TelemetryStageStatus;
      pipelineStatus?: CompilerIntelligenceStatus;
      durationMs?: number | null;
      confidenceScore?: number | null;
      riskLevel?: string | null;
      estimatedCost?: number | null;
      tokensUsed?: number | null;
      warnings?: string[];
      errors?: string[];
      blockers?: string[];
      summary?: string;
      requiresHumanReview?: boolean;
      resultId?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): void {
    if (!this.current) return;
    const event = buildEvent(
      eventType,
      this.current.executionId,
      this.current.requestId,
      this.current.organizationId,
      this.deps.idGenerator,
      this.deps.clock,
      options,
    );
    this.eventBus.emit(event);
  }
}
