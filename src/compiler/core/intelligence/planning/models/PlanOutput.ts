// ─── Plan output ───────────────────────────────────────────────────────────────
// Describes a single output produced by a plan node.

import type { DataClassification } from '../../models/ContextSource';

export interface PlanOutput {
  /** Stable name for this output, e.g. `analysis.marginDrop`. */
  name:           string;
  /** Human-readable description. */
  description:    string;
  classification: DataClassification;
}
