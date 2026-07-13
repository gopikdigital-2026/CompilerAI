// ─── Context analysis result ───────────────────────────────────────────────────
// Final artifact produced by the Context Intelligence Layer.

import type {
  BusinessIntent, BusinessObjective, BusinessEntity, BusinessConstraint, RelevantMemory,
} from './BusinessContext';
import type { ContextSource } from './ContextSource';
import type { MissingInformation } from './MissingInformation';

export type ContextStatus = 'READY' | 'NEEDS_CLARIFICATION' | 'NEEDS_DATA' | 'BLOCKED';

export interface ContextResult {
  requestId:             string;
  organizationId:        string;
  detectedIntent:        BusinessIntent;
  objectives:            BusinessObjective[];
  entities:              BusinessEntity[];
  constraints:           BusinessConstraint[];
  relevantMemory:        RelevantMemory[];
  recommendedSources:    ContextSource[];
  missingInformation:    MissingInformation[];
  sufficiencyScore:      number;   // 0–100
  status:                ContextStatus;
  createdAt:             string;   // ISO
}
