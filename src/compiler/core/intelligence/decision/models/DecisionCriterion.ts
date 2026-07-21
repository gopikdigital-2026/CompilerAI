// ─── Decision criterion ────────────────────────────────────────────────────────
// Extensible evaluation criteria used to score alternatives.

export type CriterionKind =
  | 'EXPECTED_VALUE'
  | 'COST'
  | 'TIME_TO_VALUE'
  | 'RISK'
  | 'REVERSIBILITY'
  | 'STRATEGIC_ALIGNMENT'
  | 'OPERATIONAL_FEASIBILITY'
  | 'DATA_QUALITY'
  | 'LEGAL_COMPLIANCE'
  | 'HUMAN_IMPACT'
  | 'CUSTOMER_IMPACT'
  | 'CONFIDENCE';

export const CRITERION_KINDS: readonly CriterionKind[] = [
  'EXPECTED_VALUE', 'COST', 'TIME_TO_VALUE', 'RISK', 'REVERSIBILITY',
  'STRATEGIC_ALIGNMENT', 'OPERATIONAL_FEASIBILITY', 'DATA_QUALITY',
  'LEGAL_COMPLIANCE', 'HUMAN_IMPACT', 'CUSTOMER_IMPACT', 'CONFIDENCE',
] as const;

export interface DecisionCriterion {
  kind:          CriterionKind;
  /** Weight 0–1, relative to other criteria in the same decision. */
  weight:        number;
  /** Score 0–100 for the alternative being evaluated. */
  score:         number;
  explanation:   string;
  /** References to evidence nodes/sources, when available. */
  evidenceReferences: string[];
  /** 0–100 uncertainty about this score (higher = less certain). */
  uncertainty:   number;
}
