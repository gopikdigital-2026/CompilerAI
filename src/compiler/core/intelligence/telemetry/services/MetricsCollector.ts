// ─── MetricsCollector ───────────────────────────────────────────────────────────
// Collects execution traces and computes aggregate telemetry metrics.

import type { IMetricsCollector } from '../interfaces/IMetricsCollector';
import type { TelemetryMetrics, StageMetric } from '../models/TelemetryMetrics';
import type { PerformanceSnapshot } from '../models/PerformanceSnapshot';
import type { ExecutionTrace } from '../models/ExecutionTrace';

export class MetricsCollector implements IMetricsCollector {
  private readonly traces: ExecutionTrace[] = [];
  private readonly snapshots: PerformanceSnapshot[] = [];
  private readonly idGenerator: () => string;
  private readonly clock: () => string;

  constructor(idGenerator: () => string, clock: () => string) {
    this.idGenerator = idGenerator;
    this.clock = clock;
  }

  collect(trace: ExecutionTrace): void {
    this.traces.push(trace);
    for (const stage of trace.stages) {
      this.snapshots.push({
        snapshotId: this.idGenerator(),
        executionId: trace.executionId,
        stage: stage.stage,
        timestamp: this.clock(),
        durationMs: stage.durationMs,
        memoryUsageMb: stage.memoryUsageMb,
        tokensUsed: stage.tokensUsed,
        estimatedCost: stage.estimatedCost,
        decisionsEvaluated: stage.decisionsEvaluated,
        confidenceScore: stage.confidenceScore,
        riskLevel: stage.riskLevel,
      });
    }
    this.snapshots.push({
      snapshotId: this.idGenerator(),
      executionId: trace.executionId,
      stage: null,
      timestamp: this.clock(),
      durationMs: trace.totalDurationMs,
      memoryUsageMb: null,
      tokensUsed: trace.totalTokensUsed,
      estimatedCost: trace.estimatedTotalCost,
      decisionsEvaluated: trace.totalDecisionsEvaluated,
      confidenceScore: trace.finalConfidence,
      riskLevel: trace.finalRiskLevel,
    });
  }

  compute(): TelemetryMetrics {
    const traces = this.traces;
    if (traces.length === 0) {
      return {
        totalExecutions: 0, completedExecutions: 0, blockedExecutions: 0,
        failedExecutions: 0, humanReviewExecutions: 0,
        averageDurationMs: null, averageConfidence: null, averageCost: null,
        totalTokensUsed: 0, stageMetrics: {},
      };
    }

    const stageMap: Record<string, { durations: number[]; confidences: number[]; costs: number[]; tokens: number[]; failures: number; blocks: number; count: number }> = {};
    for (const t of traces) {
      for (const s of t.stages) {
        if (!stageMap[s.stage]) stageMap[s.stage] = { durations: [], confidences: [], costs: [], tokens: [], failures: 0, blocks: 0, count: 0 };
        const m = stageMap[s.stage];
        m.count++;
        if (s.durationMs !== null) m.durations.push(s.durationMs);
        if (s.confidenceScore !== null) m.confidences.push(s.confidenceScore);
        if (s.estimatedCost !== null) m.costs.push(s.estimatedCost);
        if (s.tokensUsed !== null) m.tokens.push(s.tokensUsed);
        if (s.status === 'FAILED') m.failures++;
        if (s.status === 'BLOCKED') m.blocks++;
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
        averageCost: m.costs.length > 0 ? Math.round(m.costs.reduce((a, b) => a + b, 0) / m.costs.length) : null,
        averageTokens: m.tokens.length > 0 ? Math.round(m.tokens.reduce((a, b) => a + b, 0) / m.tokens.length) : null,
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

  getSnapshots(): PerformanceSnapshot[] {
    return [...this.snapshots];
  }

  clear(): void {
    this.traces.length = 0;
    this.snapshots.length = 0;
  }
}
