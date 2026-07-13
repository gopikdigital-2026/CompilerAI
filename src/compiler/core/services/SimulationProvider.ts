import type { ICompilerProvider, ReasoningOutput } from '../interfaces/ICompilerCore';
import type { Blueprint } from '../../../types/blueprint';
import { generateMockBlueprint } from '../../../lib/blueprintMocks';
import { IntentClassifier } from '../reasoning/IntentClassifier';

// ─── Simulation Provider ──────────────────────────────────────────────────────
// Runs entirely in-process; no real API calls.
// Replace this with OpenAIProvider / AnthropicProvider in production.

const SLEEP_REASON_MS  = 600;
const SLEEP_BUILD_MS   = 900;

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

export class SimulationProvider implements ICompilerProvider {
  readonly name         = 'Simulation';
  readonly model        = 'compiler-ai-sim-v1';
  readonly isSimulation = true;

  private readonly classifier = new IntentClassifier();

  async reason(prompt: string): Promise<ReasoningOutput> {
    await sleep(SLEEP_REASON_MS);

    const c = this.classifier.classify(prompt);
    const chainOfThought = [
      `[SIM] Prompt length: ${prompt.length} chars (~${Math.ceil(prompt.length / 4)} tokens).`,
      `[SIM] Primary intent: "${c.primaryIntent}". Trigger: ${c.triggerType}.`,
      `[SIM] Detected services: ${c.services.join(', ') || 'none'}.`,
      `[SIM] Action verbs: ${c.actionVerbs.join(', ')}.`,
      `[SIM] Data types: ${c.dataTypes.join(', ')}.`,
      `[SIM] Complexity: ${c.services.length > 3 ? 'complex' : c.services.length > 1 ? 'medium' : 'simple'}.`,
      '[SIM] Simulation mode active — no external API calls.',
    ];

    return {
      intents:        [c.primaryIntent, ...c.secondaryIntents],
      entities:       { services: c.services, dataTypes: c.dataTypes },
      actionVerbs:    c.actionVerbs.length ? c.actionVerbs : ['process'],
      dataTypes:      c.dataTypes,
      triggerType:    c.triggerType,
      services:       c.services,
      complexity:     c.services.length > 3 ? 'complex' : c.services.length > 1 ? 'medium' : 'simple',
      confidence:     c.confidence,
      chainOfThought,
    };
  }

  async generate(_reasoning: ReasoningOutput): Promise<Blueprint> {
    // In simulation the builder tool is used by PipelineRunner directly.
    // This fallback path supports calling generate() independently.
    await sleep(SLEEP_BUILD_MS);
    return generateMockBlueprint(_reasoning.services.join(' ') + ' ' + _reasoning.actionVerbs.join(' '));
  }
}
