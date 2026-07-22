// ─── Outcome evaluation ─────────────────────────────────────────────────────────
// Evaluation of an execution outcome for learning purposes.

export interface OutcomeEvaluation {
  evaluationId:    string;
  organizationId:  string;
  executionId:     string;
  /** Whether the execution was successful overall. */
  success:         boolean;
  /** Completion ratio 0–1. */
  completionRatio: number;
  /** Number of steps that succeeded. */
  stepsSucceeded:  number;
  /** Number of steps that failed. */
  stepsFailed:     number;
  /** Whether compensation was triggered. */
  rollbackTriggered: boolean;
  /** Duration in milliseconds. */
  durationMs:      number;
  /** Key learnings extracted from this outcome. */
  learnings:       string[];
  timestamp:       string;
}
