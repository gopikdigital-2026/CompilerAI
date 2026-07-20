// ─── Intent classification ─────────────────────────────────────────────────────
// Intermediate artifact produced by the IntentClassifier before validation.

import type { IntentCategory } from './IntentCategory';
import type { BusinessArea } from './BusinessArea';
import type { DecisionLevel } from './DecisionLevel';
import type { ComplexityLevel } from './ComplexityLevel';
import type { ImpactLevel } from './ImpactLevel';
import type { Urgency } from './UrgencyLevel';
import type { RequiredCapability } from './RequiredCapability';
import type { SuggestedAgentType, SuggestedToolCategory } from './SuggestedAgents';

export interface IntentClassification {
  primaryIntent:        IntentCategory;
  secondaryIntents:     IntentCategory[];
  businessArea:         BusinessArea;
  decisionLevel:        DecisionLevel;
  urgency:              Urgency;
  impact:               ImpactLevel;
  complexity:           ComplexityLevel;
  requiredCapabilities: RequiredCapability[];
  suggestedAgentTypes:     SuggestedAgentType[];
  suggestedToolCategories: SuggestedToolCategory[];
  /** Deterministic 0–100 confidence derived from observable signals. */
  confidenceScore:      number;
  /** Deterministic 0–100 ambiguity derived from observable signals. */
  ambiguityScore:       number;
  /** Human-readable reasons explaining the classification, safe to surface. */
  classificationReasons: string[];
  /** Assumptions made when signals were weak, safe to surface. */
  assumptions:          string[];
}
