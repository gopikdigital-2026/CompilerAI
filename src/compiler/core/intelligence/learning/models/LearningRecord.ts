// ─── Learning record ────────────────────────────────────────────────────────────
// A stored learning entry — persisted in the repository, versioned, tenant-isolated.

import type { LearningStatus, LearningSource } from './LearningTypes';
import type { LearningPattern } from './LearningPattern';
import type { LearningRecommendation } from './LearningRecommendation';

export interface LearningRecord {
  recordId:        string;
  organizationId:  string;
  source:          LearningSource;
  triggerId:       string;
  patterns:        LearningPattern[];
  recommendations: LearningRecommendation[];
  status:          LearningStatus;
  createdAt:       string;
  updatedAt:       string;
  version:         number;
  metadata:        Record<string, unknown>;
}
