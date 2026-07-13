// ─── Context request ──────────────────────────────────────────────────────────
// Raw business petition captured before any reasoning pipeline stage.

import type { DataClassification } from './ContextSource';

export interface ContextRequest {
  /** Unique identifier for the analysis request. */
  requestId:       string;
  /** Raw business prompt authored by the user. */
  prompt:          string;
  /** Organization the request belongs to. */
  organizationId:  string;
  /** Author of the request, when known. */
  userId?:         string;
  /** Locale hint, e.g. `es`, `en`. Defaults to `es`. */
  locale?:         string;
  /** Per-request classification hint for the most sensitive payloads. */
  classification?: DataClassification;
  /** Free-form metadata carried alongside the prompt. */
  metadata?:       Record<string, unknown>;
  /** Timestamp the request entered the intelligence layer (unix ms). */
  receivedAt:      number;
}
