import type { IConflictDetector } from '../interfaces/IConflictDetector';
import type { DecisionItem } from '../models/DecisionItem';
import type { DecisionConflict } from '../models/DecisionConflict';
import { detectConflicts } from '../rules/ConflictRules';

// ─── Conflict Detector ─────────────────────────────────────────────────────────
// Detects conflicts between decisions using deterministic rules.

export class ConflictDetector implements IConflictDetector {
  readonly id = 'conflict-detector-v1';

  detect(decisions: DecisionItem[]): DecisionConflict[] {
    return detectConflicts(decisions);
  }
}
