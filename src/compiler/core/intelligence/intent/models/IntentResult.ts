// ─── Intent result ──────────────────────────────────────────────────────────────
// Final artifact produced by the Intent Engine after validation.

import type { IntentCategory } from './IntentCategory';
import type { BusinessArea } from './BusinessArea';
import type { DecisionLevel } from './DecisionLevel';
import type { ComplexityLevel } from './ComplexityLevel';
import type { ImpactLevel } from './ImpactLevel';
import type { Urgency } from './UrgencyLevel';
import type { RequiredCapability } from './RequiredCapability';
import type { SuggestedAgentType, SuggestedToolCategory } from './SuggestedAgents';

// Re-use the Context Intelligence projections of objectives, entities and
// constraints rather than redefining them.
import type { BusinessObjective, BusinessEntity, BusinessConstraint } from '../../models/BusinessContext';

export type IntentStatus = 'READY' | 'NEEDS_CLARIFICATION' | 'BLOCKED';

export interface IntentResult {
  intentId:               string;
  requestId:              string;
  organizationId:         string;
  primaryIntent:          IntentCategory;
  secondaryIntents:       IntentCategory[];
  businessArea:           BusinessArea;
  decisionLevel:          DecisionLevel;
  urgency:                Urgency;
  impact:                 ImpactLevel;
  complexity:             ComplexityLevel;
  objectives:             BusinessObjective[];
  expectedOutcome:        string;
  affectedEntities:        BusinessEntity[];
  constraints:            BusinessConstraint[];
  requiredCapabilities:   RequiredCapability[];
  suggestedAgentTypes:      SuggestedAgentType[];
  suggestedToolCategories:  SuggestedToolCategory[];
  confidenceScore:         number;   // 0–100, deterministic
  ambiguityScore:          number;   // 0–100, deterministic
  classificationReasons:  string[];
  assumptions:             string[];
  requiresClarification:  boolean;
  clarificationQuestions:  string[];
  /** True when high impact + low confidence mandate a human gate. */
  requiresHumanApproval:  boolean;
  status:                  IntentStatus;
  createdAt:               string;   // ISO
}
