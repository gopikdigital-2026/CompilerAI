import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../models/IntentResult';
import type { IntentValidationOptions } from './IIntentValidator';
import type { IIntentClassifier } from './IIntentClassifier';
import type { IIntentValidator } from './IIntentValidator';

// ─── Intent Engine interface ───────────────────────────────────────────────────
// Orchestrates the Intent Engine pipeline:
// ContextResult → IntentClassifier → IntentValidator → IntentResult.
// Contains no business rules of its own — delegates to the injected
// classifier and validator components.

export interface IntentEngineDeps {
  classifier?: IIntentClassifier;
  validator?:  IIntentValidator;
}

export interface IIntentEngine {
  /** Unique engine implementation identifier. */
  readonly id: string;

  /**
   * Resolve a structured, explainable IntentResult from a validated context.
   */
  resolve(
    context: ContextResult,
    options?: IntentValidationOptions,
  ): Promise<IntentResult>;
}
