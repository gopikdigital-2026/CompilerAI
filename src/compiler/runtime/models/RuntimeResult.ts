// ─── Runtime result ─────────────────────────────────────────────────────────────
// Final result of a runtime execution.

import type { RuntimeStatus } from './RuntimeModels';
import type { CompilerIntelligenceResult } from '../../core/intelligence/orchestrator/models/CompilerIntelligenceModels';
import type { RuntimeExecution } from './RuntimeExecution';
import type { RuntimeEvent } from './RuntimeEvent';

export interface RuntimeResult {
  executionId:         string;
  requestId:           string;
  organizationId:      string;
  status:              RuntimeStatus;
  /** Result from the intelligence pipeline, if run. */
  intelligenceResult:  CompilerIntelligenceResult | null;
  /** Full execution record. */
  execution:           RuntimeExecution;
  /** Events emitted during this execution. */
  events:              RuntimeEvent[];
  warnings:            string[];
  errors:              string[];
  startedAt:           string;
  completedAt:         string;
  durationMs:          number;
  version:             string;
}
