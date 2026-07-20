// ─── Required capability ───────────────────────────────────────────────────────
// Abstract capabilities the system may need to fulfill the intent.
// Nothing here is executed — these are descriptors only.

export type RequiredCapability =
  | 'MEMORY_RETRIEVAL'
  | 'DATA_ANALYSIS'
  | 'DOCUMENT_ANALYSIS'
  | 'FORECASTING'
  | 'OPTIMIZATION'
  | 'REASONING'
  | 'PLANNING'
  | 'DECISION_SUPPORT'
  | 'TOOL_EXECUTION'
  | 'WORKFLOW_CREATION'
  | 'HUMAN_APPROVAL'
  | 'EXTERNAL_DATA_ACCESS';

export const REQUIRED_CAPABILITIES: readonly RequiredCapability[] = [
  'MEMORY_RETRIEVAL', 'DATA_ANALYSIS', 'DOCUMENT_ANALYSIS', 'FORECASTING',
  'OPTIMIZATION', 'REASONING', 'PLANNING', 'DECISION_SUPPORT',
  'TOOL_EXECUTION', 'WORKFLOW_CREATION', 'HUMAN_APPROVAL', 'EXTERNAL_DATA_ACCESS',
] as const;
