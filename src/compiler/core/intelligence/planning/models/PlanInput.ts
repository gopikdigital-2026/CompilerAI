// ─── Plan input ────────────────────────────────────────────────────────────────
// Describes a single input slot for a plan node.

import type { DataClassification } from '../../models/ContextSource';

export interface PlanInput {
  /** Stable name for this input slot, e.g. `crm.opportunities`. */
  name:           string;
  /** Human-readable description. */
  description:    string;
  /** Source system this input is expected from, when known. */
  source?:        string;
  /** Whether the input is currently available or still needs to be fetched. */
  available:      boolean;
  classification: DataClassification;
}
