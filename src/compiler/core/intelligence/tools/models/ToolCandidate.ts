// ─── Tool candidate ─────────────────────────────────────────────────────────────
// A tool that passed discovery and is being evaluated for selection.

import type { ToolDefinition } from './ToolDefinition';
import type { ToolCapability } from './ToolCapability';

export interface ToolCandidate {
  tool:          ToolDefinition;
  /** Matched capabilities from the intent's required capabilities. */
  matchedCapabilities:  ToolCapability[];
  /** Capability coverage ratio 0–1. */
  coverageScore: number;
  /** Whether all requirements are met. */
  eligible:      boolean;
  /** Reasons for ineligibility, if any. */
  ineligibilityReasons: string[];
}
