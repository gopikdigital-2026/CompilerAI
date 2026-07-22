// ─── ICompilerIntelligenceOrchestrator ──────────────────────────────────────────
// Interface for the top-level orchestrator that runs the full intelligence pipeline.

import type { CompilerIntelligenceRequest, CompilerIntelligenceResult } from '../models/CompilerIntelligenceModels';
import type { ITelemetryEngine } from '../../telemetry/interfaces/ITelemetryEngine';
import type { IMemoryEngine } from '../../memory/interfaces/IMemoryEngine';
import type { IToolIntelligenceEngine } from '../../tools/interfaces/IToolIntelligenceEngine';

export interface CompilerIntelligenceOrchestratorDeps {
  idGenerator:  () => string;
  clock:        () => string;
  factorWeights: Record<string, number>;
  /** Optional telemetry engine for tracing and event emission. */
  telemetry?:   ITelemetryEngine;
  /** Optional memory engine for pipeline memory persistence. */
  memory?:      IMemoryEngine;
  /** Optional tool intelligence engine for tool selection. */
  tools?:       IToolIntelligenceEngine;
}

export interface ICompilerIntelligenceOrchestrator {
  /** Run the full pipeline (or resume from a stage). */
  execute(request: CompilerIntelligenceRequest): Promise<CompilerIntelligenceResult>;
}
