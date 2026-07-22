// ─── Learning input ─────────────────────────────────────────────────────────────
// Input data from which the engine learns.

import type { LearningSource } from './LearningTypes';

export interface LearningInput {
  inputId:         string;
  organizationId:  string;
  source:          LearningSource;
  /** The event or artifact that triggered this learning input. */
  triggerId:       string;
  /** Raw data from the source — execution results, feedback text, errors, etc. */
  data:            Record<string, unknown>;
  /** Human feedback text, if source is HUMAN_FEEDBACK. */
  feedbackText:    string | null;
  /** Feedback rating: positive, negative, neutral. */
  feedbackRating:  'positive' | 'negative' | 'neutral' | null;
  /** Timestamp when the input was generated. */
  timestamp:       string;
}
