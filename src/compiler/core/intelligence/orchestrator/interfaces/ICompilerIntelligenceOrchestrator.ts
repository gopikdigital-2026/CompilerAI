// ─── ICompilerIntelligenceOrchestrator ──────────────────────────────────────────
// Interface for the top-level orchestrator that runs the full intelligence pipeline.

import type { CompilerIntelligenceRequest, CompilerIntelligenceResult } from '../models/CompilerIntelligenceModels';

export interface CompilerIntelligenceOrchestratorDeps {
  idGenerator:  () => string;
  clock:        () => string;
  factorWeights: Record<string, number>;
}

export interface ICompilerIntelligenceOrchestrator {
  /** Run the full pipeline (or resume from a stage). */
  execute(request: CompilerIntelligenceRequest): Promise<CompilerIntelligenceResult>;
}
