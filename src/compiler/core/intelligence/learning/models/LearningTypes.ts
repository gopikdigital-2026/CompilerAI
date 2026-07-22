// ─── Learning source types ──────────────────────────────────────────────────────
// What the engine learns from.

export type LearningSource =
  | 'EXECUTION_RESULT'
  | 'HUMAN_FEEDBACK'
  | 'ERROR'
  | 'DECISION'
  | 'CONFIDENCE'
  | 'METRIC'
  | 'MEMORY';

export const LEARNING_SOURCES: readonly LearningSource[] = [
  'EXECUTION_RESULT', 'HUMAN_FEEDBACK', 'ERROR', 'DECISION',
  'CONFIDENCE', 'METRIC', 'MEMORY',
] as const;

export type LearningStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'APPLIED';

export const LEARNING_STATUSES: readonly LearningStatus[] = [
  'PENDING', 'APPROVED', 'REJECTED', 'APPLIED',
] as const;

export type PatternType = 'SUCCESS' | 'FAILURE' | 'REGRESSION' | 'IMPROVEMENT' | 'ANOMALY';

export const PATTERN_TYPES: readonly PatternType[] = [
  'SUCCESS', 'FAILURE', 'REGRESSION', 'IMPROVEMENT', 'ANOMALY',
] as const;
