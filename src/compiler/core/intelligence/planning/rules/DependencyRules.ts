// ─── Dependency rules ──────────────────────────────────────────────────────────
// Pure rules for deriving edge dependency types from node types.

import type { PlanNodeType } from '../models/PlanNodeType';
import type { DependencyType } from '../models/PlanEdge';

export function deriveDependencyType(
  sourceType: PlanNodeType, targetType: PlanNodeType,
): DependencyType {
  if (targetType === 'HUMAN_APPROVAL') return 'APPROVAL_DEPENDENCY';
  if (targetType === 'VALIDATION') return 'VALIDATION_DEPENDENCY';
  if (sourceType === 'DATA_RETRIEVAL' || sourceType === 'MEMORY_RETRIEVAL') return 'DATA_DEPENDENCY';
  return 'FINISH_TO_START';
}

export function isConditional(sourceType: PlanNodeType, targetType: PlanNodeType): boolean {
  return targetType === 'HUMAN_APPROVAL' || sourceType === 'COMPARISON';
}
