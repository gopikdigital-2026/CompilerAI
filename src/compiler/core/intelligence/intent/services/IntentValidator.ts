import type { IIntentValidator, IntentValidationOptions, IntentValidationOutcome } from '../interfaces/IIntentValidator';
import type { IntentClassification } from '../models/IntentClassification';
import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../models/IntentResult';

import { detectContradictions, scoreCategories } from '../rules/IntentClassificationRules';

// ─── Intent Validator ──────────────────────────────────────────────────────────
// Verifies classification coherence, confidence thresholds and contradictions.
// Decides whether clarifying questions or a human approval gate are required.

const DEFAULT_OPTIONS: Required<IntentValidationOptions> = {
  confidenceThreshold: 55,
  maxAmbiguity:        45,
  highImpactLevels:    ['HIGH', 'CRITICAL'],
};

export class IntentValidator implements IIntentValidator {
  readonly id = 'intent-validator-v1';

  validate(
    classification: IntentClassification,
    context:        ContextResult,
    options?:       IntentValidationOptions,
  ): IntentValidationOutcome {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // ── Structural validity ──────────────────────────────────────────────────
    if (!context || !context.requestId) {
      return this.blocked('Contexto de origen inválido.');
    }
    if (context.status === 'BLOCKED') {
      return this.blocked('El contexto de origen está bloqueado.');
    }
    if (classification.primaryIntent === 'UNKNOWN') {
      return this.clarify(
        ['¿Podrías describir con más detalle qué resultado esperas obtener?'],
        ['No se identificó una intención principal reconocible.'],
      );
    }

    // ── Contradictions ────────────────────────────────────────────────────────
    const categoryScores = scoreCategories(context);
    const contradictions = detectContradictions(categoryScores);
    const severeContradictions = contradictions.length >= 2;

    // ── Confidence / ambiguity thresholds ─────────────────────────────────────
    const lowConfidence = classification.confidenceScore < opts.confidenceThreshold;
    const highAmbiguity  = classification.ambiguityScore > opts.maxAmbiguity;

    const clarificationQuestions: string[] = [];
    if (lowConfidence) {
      clarificationQuestions.push(
        'La confianza de la clasificación es baja. ¿Puedes concretar el objetivo principal?',
      );
    }
    if (highAmbiguity) {
      clarificationQuestions.push(
        'Existen varias interpretaciones posibles. ¿Cuál de estas intenciones es la prioritaria?',
      );
    }
    if (classification.secondaryIntents.length >= 3) {
      clarificationQuestions.push(
        'Se detectaron múltiples intenciones secundarias. ¿Quieres que las aborde por separado?',
      );
    }
    if (context.missingInformation.some(g => g.severity === 'high')) {
      clarificationQuestions.push(
        'Falta información empresarial relevante. ¿Desde qué sistemas debería obtener contexto?',
      );
    }

    const requiresClarification = clarificationQuestions.length > 0 || severeContradictions;

    // ── Human approval gate ────────────────────────────────────────────────────
    // CRITICAL impact always mandates a human gate. High impact + low confidence
    // also mandates it. Restricted data never auto-grants external execution —
    // the gate applies instead.
    const isCritical = classification.impact === 'CRITICAL';
    const isHighImpact = opts.highImpactLevels.includes(classification.impact);
    const requiresHumanApproval = isCritical || (isHighImpact && (lowConfidence || highAmbiguity));

    // ── Status ────────────────────────────────────────────────────────────────
    let status: IntentValidationOutcome['status'] = 'READY';
    if (requiresHumanApproval && requiresClarification && severeContradictions) {
      status = 'BLOCKED';
    } else if (requiresClarification) {
      status = 'NEEDS_CLARIFICATION';
    }

    return {
      valid:                 status !== 'BLOCKED',
      requiresClarification,
      clarificationQuestions,
      requiresHumanApproval,
      contradictions,
      status,
    };
  }

  buildResult(
    classification: IntentClassification,
    context:        ContextResult,
    outcome:        IntentValidationOutcome,
  ): IntentResult {
    // Restricted data mandates a human approval capability so the Planning
    // Engine never auto-grants external execution.
    const requiredCapabilities = [...classification.requiredCapabilities];
    if (outcome.requiresHumanApproval && !requiredCapabilities.includes('HUMAN_APPROVAL')) {
      requiredCapabilities.push('HUMAN_APPROVAL');
    }

    return {
      intentId:               `intent-${context.requestId}`,
      requestId:              context.requestId,
      organizationId:         context.organizationId,
      primaryIntent:          classification.primaryIntent,
      secondaryIntents:       classification.secondaryIntents,
      businessArea:           classification.businessArea,
      decisionLevel:          classification.decisionLevel,
      urgency:                classification.urgency,
      impact:                 classification.impact,
      complexity:             classification.complexity,
      objectives:             context.objectives,
      expectedOutcome:        this.deriveExpectedOutcome(classification, context),
      affectedEntities:        context.entities,
      constraints:            context.constraints,
      requiredCapabilities:   requiredCapabilities,
      suggestedAgentTypes:     classification.suggestedAgentTypes,
      suggestedToolCategories: classification.suggestedToolCategories,
      confidenceScore:         classification.confidenceScore,
      ambiguityScore:          classification.ambiguityScore,
      classificationReasons:  classification.classificationReasons,
      assumptions:             classification.assumptions,
      requiresClarification:  outcome.requiresClarification,
      clarificationQuestions:  outcome.clarificationQuestions,
      requiresHumanApproval:  outcome.requiresHumanApproval,
      status:                  outcome.status,
      createdAt:               new Date().toISOString(),
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private deriveExpectedOutcome(
    classification: IntentClassification, context: ContextResult,
  ): string {
    if (context.objectives.length > 0) {
      return context.objectives.map(o => o.label).join('; ');
    }
    return `Resultado esperado para la intención "${classification.primaryIntent}" en el área "${classification.businessArea}".`;
  }

  private blocked(reason: string): IntentValidationOutcome {
    return {
      valid:                 false,
      requiresClarification: false,
      clarificationQuestions: [],
      requiresHumanApproval: false,
      contradictions:        [reason],
      status:                'BLOCKED',
    };
  }

  private clarify(
    questions: string[], contradictions: string[],
  ): IntentValidationOutcome {
    return {
      valid:                 false,
      requiresClarification: true,
      clarificationQuestions: questions,
      requiresHumanApproval: false,
      contradictions,
      status:                'NEEDS_CLARIFICATION',
    };
  }
}
