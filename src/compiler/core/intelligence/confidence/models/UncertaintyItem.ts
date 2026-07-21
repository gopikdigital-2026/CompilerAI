// ─── Uncertainty item ──────────────────────────────────────────────────────────
// A single source of uncertainty detected in the supplied results.

import type { RiskLevel } from '../../planning/models/PlanRisk';

export type UncertaintyType =
  | 'MISSING_DATA'
  | 'CONTRADICTORY_DATA'
  | 'AMBIGUOUS_OBJECTIVE'
  | 'INCOMPLETE_CONSTRAINT'
  | 'LOW_EVIDENCE_QUALITY'
  | 'EXTERNAL_DEPENDENCY'
  | 'HIGH_VARIABILITY'
  | 'UNVALIDATED_ASSUMPTION'
  | 'UNRESOLVED_CONFLICT'
  | 'IRREVERSIBLE_DECISION'
  | 'MARGINAL_ALTERNATIVE_GAP';

export interface UncertaintyItem {
  uncertaintyId:       string;
  type:                UncertaintyType;
  description:         string;
  severity:            RiskLevel;
  affectedSourceIds:   string[];
  resolvable:          boolean;
  suggestedResolution: string;
}
