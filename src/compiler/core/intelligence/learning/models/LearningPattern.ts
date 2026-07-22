// ─── Learning pattern ───────────────────────────────────────────────────────────
// A detected pattern from analyzing multiple learning inputs.

import type { PatternType } from './LearningTypes';

export interface LearningPattern {
  patternId:       string;
  organizationId:  string;
  type:            PatternType;
  description:     string;
  /** Input IDs that contributed to this pattern. */
  sourceInputIds:  string[];
  /** Confidence in the pattern 0–100. */
  confidence:      number;
  /** Number of occurrences that form this pattern. */
  occurrences:     number;
  /** Detected trend direction. */
  trend:           'UP' | 'DOWN' | 'STABLE';
  timestamp:       string;
  /** Human-readable explanation. */
  explanation:     string;
}
