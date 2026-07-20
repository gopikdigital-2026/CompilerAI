// ─── Plan risk ─────────────────────────────────────────────────────────────────

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export const RISK_LEVELS: readonly RiskLevel[] = [
  'LOW', 'MEDIUM', 'HIGH', 'CRITICAL',
] as const;

export type RiskKind =
  | 'INSUFFICIENT_DATA'
  | 'RESTRICTED_INFORMATION'
  | 'IRREVERSIBLE_ACTION'
  | 'FINANCIAL_IMPACT'
  | 'WORKFORCE_IMPACT'
  | 'LEGAL_IMPACT'
  | 'EXTERNAL_EXPOSURE'
  | 'LOW_CONFIDENCE'
  | 'EXTERNAL_DEPENDENCY'
  | 'HIGH_IMPACT_AUTOMATION';

export interface PlanRisk {
  kind:        RiskKind;
  level:       RiskLevel;
  description: string;
  /** Node ids the risk applies to, when applicable. */
  nodeIds:     string[];
  mitigation:  string;
}
