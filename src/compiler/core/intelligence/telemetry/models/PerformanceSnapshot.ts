// ─── Performance snapshot ───────────────────────────────────────────────────────
// Point-in-time performance metrics for a single stage or the entire pipeline.

export interface PerformanceSnapshot {
  snapshotId:     string;
  executionId:    string;
  stage:          string | null;  // null = pipeline-level
  timestamp:      string;   // ISO
  durationMs:     number | null;
  memoryUsageMb:  number | null;
  tokensUsed:     number | null;
  estimatedCost:  number | null;
  decisionsEvaluated: number | null;
  confidenceScore: number | null;
  riskLevel:      string | null;
}
