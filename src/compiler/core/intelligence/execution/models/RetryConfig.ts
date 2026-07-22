// ─── Retry config ───────────────────────────────────────────────────────────────

export interface RetryConfig {
  maxRetries:    number;
  /** Base delay between retries in ms (simulated, not real). */
  baseDelayMs:   number;
  /** Whether to use exponential backoff. */
  exponential:   boolean;
}

export interface RetryAttempt {
  attempt:    number;
  stepId:     string;
  success:    boolean;
  error:      string | null;
  delayMs:    number;
  timestamp:  string;
}
