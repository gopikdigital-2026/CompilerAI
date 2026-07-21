// ─── ICompilerIntelligenceOrchestrator ──────────────────────────────────────────
// Interface for the top-level orchestrator that runs the full intelligence pipeline.

import type { CompilerIntelligenceRequest, CompilerIntelligenceResult } from '../models/CompilerIntelligenceModels';
import type { ITelemetryEngine } from '../../telemetry/interfaces/ITelemetryEngine';

export interface CompilerIntelligenceOrchestratorDeps {
  idGenerator:  () => string;
  clock:        () => string;
  factorWeights: Record<string, number>;
  /** Optional telemetry engine for tracing and event emission. */
  telemetry?:   ITelemetryEngine;
}

export interface ICompilerIntelligenceOrchestrator {
  /** Run the full pipeline (or resume from a stage). */
  execute(request: CompilerIntelligenceRequest): Promise<CompilerIntelligenceResult>;
}
