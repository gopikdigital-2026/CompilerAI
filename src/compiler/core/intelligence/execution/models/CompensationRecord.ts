// ─── Compensation record ────────────────────────────────────────────────────────
// Records a compensation (rollback) action for a step.

export interface CompensationRecord {
  compensationId: string;
  executionId:    string;
  stepId:         string;
  toolId:         string;
  reason:         string;
  success:        boolean;
  timestamp:      string;
  actions:        string[];
}
