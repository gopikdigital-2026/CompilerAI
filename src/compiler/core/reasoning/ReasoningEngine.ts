import type { ICompilerProvider, ReasoningOutput } from '../interfaces/ICompilerCore';
import { IntentClassifier } from './IntentClassifier';
import type { ContextWindow } from '../memory/ContextWindow';

// ─── Reasoning Engine ─────────────────────────────────────────────────────────
// Orchestrates multi-step reasoning over the prompt.
// In simulation mode the logic runs locally.
// In production mode, delegate to the injected ICompilerProvider.

export class ReasoningEngine {
  private readonly classifier = new IntentClassifier();

  constructor(
    private readonly provider: ICompilerProvider,
    private readonly context: ContextWindow,
  ) {}

  async reason(prompt: string): Promise<ReasoningOutput> {
    // Step 1 — classify locally (fast, no LLM needed)
    const classification = this.classifier.classify(prompt);

    // Step 2 — record in context window
    this.context.push({
      role:    'user',
      content: prompt,
      stageId: 'parse',
    });

    // Step 3 — if real provider, call its reason() method
    //          if simulation, synthesize from classification
    let reasoning: ReasoningOutput;

    if (this.provider.isSimulation) {
      reasoning = this.synthesizeReasoning(prompt, classification);
    } else {
      reasoning = await this.provider.reason(prompt, this.context.summarize());
    }

    // Step 4 — store result in context
    this.context.push({
      role:    'assistant',
      content: JSON.stringify(reasoning),
      stageId: 'reason',
    });

    return reasoning;
  }

  private synthesizeReasoning(
    prompt: string,
    c: ReturnType<IntentClassifier['classify']>,
  ): ReasoningOutput {
    const chainOfThought = [
      `Prompt analizado: ${prompt.length} caracteres, idioma detectado: ${/[áéíóúñ¿¡]/i.test(prompt) ? 'ES' : 'EN'}.`,
      `Intención primaria: "${c.primaryIntent}". Intenciones secundarias: ${c.secondaryIntents.join(', ') || 'ninguna'}.`,
      `Servicios detectados: ${c.services.length > 0 ? c.services.join(', ') : 'ninguno específico'}.`,
      `Tipo de disparador: ${c.triggerType}. Acciones: ${c.actionVerbs.join(', ') || 'process'}.`,
      `Entidades de datos: ${c.dataTypes.join(', ')}. Presencia de IA: ${c.hasAI ? 'sí' : 'no'}.`,
      `Complejidad estimada basada en ${c.services.length} servicios y ${c.actionVerbs.length} acciones.`,
      'Generando plan de arquitectura modular con separación de responsabilidades.',
      'Calculando agentes necesarios por rol funcional.',
    ];

    const complexity: ReasoningOutput['complexity'] =
      c.services.length > 4 || c.actionVerbs.length > 4 ? 'complex'
      : c.services.length > 2 || c.actionVerbs.length > 2 ? 'medium'
      : 'simple';

    return {
      intents:        [c.primaryIntent, ...c.secondaryIntents],
      entities:       { services: c.services, dataTypes: c.dataTypes },
      actionVerbs:    c.actionVerbs.length ? c.actionVerbs : ['process'],
      dataTypes:      c.dataTypes,
      triggerType:    c.triggerType,
      services:       c.services,
      complexity,
      confidence:     c.confidence,
      hasAI:          c.hasAI ?? false,
      chainOfThought,
    };
  }
}
