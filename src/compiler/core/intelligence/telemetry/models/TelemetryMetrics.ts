// ─── Telemetry metrics ──────────────────────────────────────────────────────────
// Aggregate metrics computed from execution traces.

export interface TelemetryMetrics {
  totalExecutions:      number;
  completedExecutions:  number;
  blockedExecutions:    number;
  failedExecutions:     number;
  humanReviewExecutions: number;
  averageDurationMs:    number | null;
  averageConfidence:    number | null;
  averageCost:          number | null;
  totalTokensUsed:      number;
  stageMetrics:         Record<string, StageMetric>;
}

export interface StageMetric {
  stage:           string;
  executions:      number;
  averageDurationMs: number | null;
  averageConfidence: number | null;
  failureRate:     number;   // 0–1
  blockRate:       number;   // 0–1
}
