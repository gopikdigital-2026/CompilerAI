import type { ContextResult } from '../../models/ContextResult';
import type { IntentClassification } from '../models/IntentClassification';
import type { IntentResult } from '../models/IntentResult';

// ─── Intent Validator interface ───────────────────────────────────────────────
// Verifies that an IntentClassification is coherent, confidence is above the
// configured threshold, and no severe contradictions exist. Decides whether
// clarifying questions must be surfaced and whether a human approval gate is
// required.

export interface IntentValidationOptions {
  /** Minimum confidence (0–100) required to avoid clarification. */
  confidenceThreshold?:   number;
  /** Maximum ambiguity (0–100) tolerated before clarification is required. */
  maxAmbiguity?:          number;
  /** Impact levels that mandate a human approval gate when confidence is low. */
  highImpactLevels?:      Array<import('../models/ImpactLevel').ImpactLevel>;
}

export interface IntentValidationOutcome {
  valid:                 boolean;
  requiresClarification: boolean;
  clarificationQuestions: string[];
  requiresHumanApproval: boolean;
  contradictions:        string[];
  status:                'READY' | 'NEEDS_CLARIFICATION' | 'BLOCKED';
}

export interface IIntentValidator {
  /** Unique validator implementation identifier. */
  readonly id: string;

  /**
   * Validate the classification against the originating context.
   */
  validate(
    classification: IntentClassification,
    context:        ContextResult,
    options?:       IntentValidationOptions,
  ): IntentValidationOutcome;

  /**
   * Assemble the final IntentResult artifact from the classification and the
   * validation outcome.
   */
  buildResult(
    classification: IntentClassification,
    context:        ContextResult,
    outcome:        IntentValidationOutcome,
  ): IntentResult;
}
