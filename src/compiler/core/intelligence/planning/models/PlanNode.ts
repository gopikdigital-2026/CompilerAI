// ─── Plan node ─────────────────────────────────────────────────────────────────
// A single unit of work within the execution DAG.

import type { PlanNodeType } from './PlanNodeType';
import type { PlanInput } from './PlanInput';
import type { PlanOutput } from './PlanOutput';
import type { PlanStatus } from './PlanStatus';
import type { RiskLevel } from './PlanRisk';
import type { RequiredCapability } from '../../intent/models/RequiredCapability';
import type { SuggestedAgentType, SuggestedToolCategory } from '../../intent/models/SuggestedAgents';
import type { ComplexityLevel } from '../../intent/models/ComplexityLevel';

export interface PlanNode {
  nodeId:                  string;
  type:                    PlanNodeType;
  title:                   string;
  description:             string;
  objective:               string;
  /** Node ids this node depends on. */
  dependencies:            string[];
  inputs:                  PlanInput[];
  expectedOutputs:         PlanOutput[];
  requiredCapabilities:    RequiredCapability[];
  suggestedAgentType:      SuggestedAgentType;
  suggestedToolCategories: SuggestedToolCategory[];
  requiresHumanApproval:  boolean;
  approvalReason?:         string;
  riskLevel:               RiskLevel;
  estimatedComplexity:     ComplexityLevel;
  canRunInParallel:        boolean;
  /** Lower number = higher priority. */
  executionPriority:       number;
  status:                  PlanStatus;
  metadata:                Record<string, unknown>;
}
