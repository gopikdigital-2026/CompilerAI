// ─── Feedback entry ─────────────────────────────────────────────────────────────
// Processed human feedback ready for pattern extraction.

export interface FeedbackEntry {
  feedbackId:      string;
  organizationId:  string;
  triggerId:       string;
  text:            string;
  rating:          'positive' | 'negative' | 'neutral';
  /** Extracted keywords from the feedback text. */
  keywords:        string[];
  /** Sentiment score -100 to 100. */
  sentimentScore:  number;
  timestamp:       string;
}
