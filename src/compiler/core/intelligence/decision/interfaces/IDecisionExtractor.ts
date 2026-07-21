import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionRequest } from '../models/DecisionRequest';
import type { DecisionItem } from '../models/DecisionItem';

// ─── Decision Extractor interface ──────────────────────────────────────────────
// Identifies decision points within an ExecutionPlan. Does not reconstruct the plan.

export interface IDecisionExtractor {
  readonly id: string;
  extract(plan: ExecutionPlan, scope: DecisionRequest['requestedDecisionScope']): DecisionItem[];
}
