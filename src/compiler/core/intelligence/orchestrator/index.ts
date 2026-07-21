// ─── Compiler Intelligence Orchestrator — public API ────────────────────────────

// ── Service ──────────────────────────────────────────────────────────────────
export { CompilerIntelligenceOrchestrator } from './services/CompilerIntelligenceOrchestrator';

// ── Interface ──────────────────────────────────────────────────────────────────
export type {
  ICompilerIntelligenceOrchestrator,
  CompilerIntelligenceOrchestratorDeps,
} from './interfaces/ICompilerIntelligenceOrchestrator';

// ── Models ─────────────────────────────────────────────────────────────────────
export type {
  IntelligenceStage, CompilerIntelligenceStatus,
  TraceEntry, CompilerIntelligenceResult, CompilerIntelligenceRequest,
} from './models/CompilerIntelligenceModels';
export {
  PIPELINE_STAGES, COMPILER_INTELLIGENCE_STATUSES,
} from './models/CompilerIntelligenceModels';

// ── Errors ─────────────────────────────────────────────────────────────────────
export {
  OrchestratorError, PipelineBlockedError, InvalidOrchestratorInputError,
} from './errors/OrchestratorErrors';
