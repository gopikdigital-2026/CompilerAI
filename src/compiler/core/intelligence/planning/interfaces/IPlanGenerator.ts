import type { IntentResult } from '../../intent/models/IntentResult';
import type { PlanNode } from '../models/PlanNode';
import type { PlanEdge } from '../models/PlanEdge';
import type { PlanRisk } from '../models/PlanRisk';
import type { HumanApprovalRequirement } from '../models/HumanApprovalRequirement';

// ─── Plan Generator interface ──────────────────────────────────────────────────
// Transforms an IntentResult into a set of plan nodes, edges, risks and
// approval requirements using deterministic rules.

export interface PlanGenerationOutput {
  nodes:                    PlanNode[];
  edges:                    PlanEdge[];
  risks:                    PlanRisk[];
  humanApprovalRequirements: HumanApprovalRequirement[];
  requiredDataSources:      string[];
  assumptions:              string[];
  title:                    string;
  objective:                string;
  summary:                  string;
}

export interface IPlanGenerator {
  readonly id: string;

  generate(intent: IntentResult, deps?: {
    idGenerator?: () => string;
    clock?:       () => string;
  }): PlanGenerationOutput;
}
