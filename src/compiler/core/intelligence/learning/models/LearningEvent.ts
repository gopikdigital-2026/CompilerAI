// ─── Learning event ─────────────────────────────────────────────────────────────
// Events emitted by the Learning Engine.

import type { LearningStatus } from './LearningTypes';

export type LearningEventType =
  | 'LearningInputProcessed'
  | 'PatternDetected'
  | 'RecommendationGenerated'
  | 'RecommendationApproved'
  | 'RecommendationRejected'
  | 'RegressionDetected'
  | 'LearningRecordStored';

export interface LearningEvent {
  eventId:        string;
  eventType:      LearningEventType;
  organizationId: string;
  timestamp:      string;
  summary:        string;
  recordId:       string | null;
  status:         LearningStatus | null;
  metadata:       Record<string, unknown>;
}
