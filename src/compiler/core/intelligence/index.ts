// ─── CompilerAI — Context Intelligence Layer ───────────────────────────────────
// Public API surface for src/compiler/core/intelligence

// ── Service (main entry point) ────────────────────────────────────────────────
export { ContextIntelligenceService } from './ContextIntelligenceService';
export type { ContextIntelligenceDeps } from './ContextIntelligenceService';

// ── Context components ─────────────────────────────────────────────────────────
export { ContextAnalyzer } from './context/ContextAnalyzer';
export { ContextEnricher } from './context/ContextEnricher';
export { ContextValidator } from './context/ContextValidator';
export { maxClassification } from './context/ContextAnalyzer';

// ── Interfaces ────────────────────────────────────────────────────────────────
export type { IContextAnalyzer } from './interfaces/IContextAnalyzer';
export type {
  IContextEnricher, ContextEnrichment, EnterpriseMemorySnapshot,
} from './interfaces/IContextEnricher';
export type {
  IContextValidator, ValidationOutcome, SufficiencyBreakdown,
} from './interfaces/IContextValidator';

// ── Models ─────────────────────────────────────────────────────────────────────
export type { ContextRequest } from './models/ContextRequest';
export type {
  BusinessContext, BusinessIntent, BusinessObjective, BusinessEntity,
  BusinessConstraint, Urgency, RelevantMemory,
} from './models/BusinessContext';
export type {
  ContextResult, ContextStatus,
} from './models/ContextResult';
export type {
  ContextSource, SourceKind, DataClassification,
} from './models/ContextSource';
export type {
  MissingInformation, InformationGapKind,
} from './models/MissingInformation';
