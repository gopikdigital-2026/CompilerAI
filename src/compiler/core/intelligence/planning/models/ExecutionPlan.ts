// ─── Execution plan ────────────────────────────────────────────────────────────
// The final artifact produced by the Planning Engine.

import type { ExecutionGraph } from './ExecutionGraph';
import type { PlanStatus } from './PlanStatus';
import type { PlanRisk } from './PlanRisk';
import type { HumanApprovalRequirement } from './HumanApprovalRequirement';
import type { RequiredCapability } from '../../intent/models/RequiredCapability';
import type { SuggestedAgentType, SuggestedToolCategory } from '../../intent/models/SuggestedAgents';
import type { ComplexityLevel } from '../../intent/models/ComplexityLevel';

export interface ExecutionPlan {
  planId:                    string;
  requestId:                 string;
  organizationId:            string;
  intentId:                  string;
  title:                     string;
  objective:                 string;
  summary:                   string;
  status:                    PlanStatus;
  graph:                     ExecutionGraph;
  requiredCapabilities:     RequiredCapability[];
  suggestedAgentTypes:       SuggestedAgentType[];
  suggestedToolCategories:   SuggestedToolCategory[];
  requiredDataSources:       string[];
  assumptions:               string[];
  risks:                     PlanRisk[];
  blockers:                  string[];
  humanApprovalRequirements: HumanApprovalRequirement[];
  estimatedComplexity:       ComplexityLevel;
  confidenceScore:           number;   // 0–100
  generatedAt:               string;   // ISO
  version:                  string;
}
