// ─── Plan node type ────────────────────────────────────────────────────────────
// Work unit categories the Planning Engine can emit. None are executed here.

export type PlanNodeType =
  | 'DATA_RETRIEVAL'
  | 'MEMORY_RETRIEVAL'
  | 'ANALYSIS'
  | 'REASONING'
  | 'FORECASTING'
  | 'COMPARISON'
  | 'OPTIMIZATION'
  | 'RECOMMENDATION'
  | 'DECISION_PREPARATION'
  | 'DOCUMENT_GENERATION'
  | 'WORKFLOW_DESIGN'
  | 'HUMAN_APPROVAL'
  | 'EXTERNAL_RESEARCH'
  | 'VALIDATION'
  | 'FINAL_SYNTHESIS';

export const PLAN_NODE_TYPES: readonly PlanNodeType[] = [
  'DATA_RETRIEVAL', 'MEMORY_RETRIEVAL', 'ANALYSIS', 'REASONING',
  'FORECASTING', 'COMPARISON', 'OPTIMIZATION', 'RECOMMENDATION',
  'DECISION_PREPARATION', 'DOCUMENT_GENERATION', 'WORKFLOW_DESIGN',
  'HUMAN_APPROVAL', 'EXTERNAL_RESEARCH', 'VALIDATION', 'FINAL_SYNTHESIS',
] as const;
