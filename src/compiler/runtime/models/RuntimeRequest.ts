// ─── Runtime request ────────────────────────────────────────────────────────────

import type { CompilerIntelligenceRequest } from '../../core/intelligence/orchestrator/models/CompilerIntelligenceModels';
import type { RiskLevel } from '../../core/intelligence/planning/models/PlanRisk';

export interface RuntimeRequest {
  requestId:           string;
  organizationId:      string;
  userId:             string | null;
  /** The intelligence pipeline request to run. */
  intelligenceRequest: CompilerIntelligenceRequest;
  /** Risk tolerance for the runtime. */
  riskTolerance:       RiskLevel;
  /** Minimum confidence threshold (0–100). */
  minimumConfidenceThreshold: number;
  /** Idempotency key — duplicate requests are deduplicated. */
  idempotencyKey:      string;
  /** Maximum execution duration in ms. */
  maxDurationMs:       number;
  /** Whether to allow automatic rollback on failure. */
  allowRollback:       boolean;
  /** Whether human approval is required before execution. */
  requireApproval:     boolean;
  /** Locale hint. */
  locale:             string;
  /** Free-form metadata. */
  metadata:           Record<string, unknown>;
  /** Timestamp the request was received. */
  receivedAt:         string;
}
