// ─── Decision alternative ──────────────────────────────────────────────────────
// A single option that the Decision Engine can recommend or reject.

import type { RequiredCapability } from '../../intent/models/RequiredCapability';
import type { AlternativeEvaluation } from './AlternativeEvaluation';

export interface DecisionAlternative {
  alternativeId:          string;
  title:                   string;
  description:             string;
  expectedBenefits:        string[];
  expectedCosts:           string[];
  risks:                   string[];
  constraints:             string[];
  dependencies:            string[];
  reversibility:           'REVERSIBLE' | 'PARTIALLY_REVERSIBLE' | 'IRREVERSIBLE';
  requiredCapabilities:   RequiredCapability[];
  requiredData:            string[];
  requiresHumanApproval:  boolean;
  evaluations:             AlternativeEvaluation[];
}
