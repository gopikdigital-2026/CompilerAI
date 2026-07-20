import type { IIntentEngine, IntentEngineDeps } from '../interfaces/IIntentEngine';
import type { IIntentClassifier } from '../interfaces/IIntentClassifier';
import type { IIntentValidator, IntentValidationOptions } from '../interfaces/IIntentValidator';
import type { ContextResult } from '../../models/ContextResult';
import type { ContextRequest } from '../../models/ContextRequest';
import type { IntentResult } from '../models/IntentResult';

import { IntentClassifier } from './IntentClassifier';
import { IntentValidator } from './IntentValidator';

// ─── Intent Engine ─────────────────────────────────────────────────────────────
// Orchestrates the Intent Engine pipeline:
// ContextResult → IntentClassifier → IntentValidator → IntentResult.
// Contains no business rules of its own — delegates to the injected
// classifier and validator components.

export class IntentEngine implements IIntentEngine {
  readonly id = 'intent-engine-v1';

  private readonly classifier: IIntentClassifier;
  private readonly validator:  IIntentValidator;

  constructor(deps: IntentEngineDeps = {}) {
    this.classifier = (deps.classifier as IIntentClassifier | undefined) ?? new IntentClassifier();
    this.validator  = (deps.validator  as IIntentValidator  | undefined) ?? new IntentValidator();
  }

  async resolve(
    context: ContextResult,
    options?: IntentValidationOptions,
    request?: ContextRequest,
  ): Promise<IntentResult> {
    // Step 1 — classify the validated context into a structured intent projection.
    const classification = this.classifier.classify(context, request);

    // Step 2 — validate coherence, confidence and contradictions.
    const outcome = this.validator.validate(classification, context, options);

    // Step 3 — assemble the final IntentResult artifact.
    return this.validator.buildResult(classification, context, outcome);
  }
}
