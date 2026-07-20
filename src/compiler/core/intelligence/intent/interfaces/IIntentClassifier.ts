import type { ContextResult } from '../../models/ContextResult';
import type { ContextRequest } from '../../models/ContextRequest';
import type { IntentClassification } from '../models/IntentClassification';

// ─── Intent Classifier interface ──────────────────────────────────────────────
// Transforms a validated ContextResult into a structured, typed and explainable
// projection of the user's business intent. Implementations must be deterministic
// and free of any LLM provider coupling.

export interface IIntentClassifier {
  /** Unique classifier implementation identifier. */
  readonly id: string;

  /**
   * Classify the validated context into a structured intent projection.
   * The optional `request` carries the raw prompt used for lexical matching.
   * @throws when the context result is structurally invalid.
   */
  classify(context: ContextResult, request?: ContextRequest): IntentClassification;
}
