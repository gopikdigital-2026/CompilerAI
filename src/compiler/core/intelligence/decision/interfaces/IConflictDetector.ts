import type { DecisionItem } from '../models/DecisionItem';
import type { DecisionConflict } from '../models/DecisionConflict';

// ─── Conflict Detector interface ──────────────────────────────────────────────
// Detects conflicts between decisions, alternatives, and constraints.

export interface IConflictDetector {
  readonly id: string;
  detect(decisions: DecisionItem[]): DecisionConflict[];
}
