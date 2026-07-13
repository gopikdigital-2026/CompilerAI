// ─── CompilerAI — Core Engine ─────────────────────────────────────────────────
// Public API surface for src/compiler/core

// ── Service (main entry point) ────────────────────────────────────────────────
export { compilerCore, CompilerCoreService, SIMULATION_MODE } from './services/CompilerCoreService';
export { SimulationProvider } from './services/SimulationProvider';

// ── Orchestrator ──────────────────────────────────────────────────────────────
export { CompilerOrchestrator } from './orchestrator/CompilerOrchestrator';
export { PipelineRunner } from './orchestrator/PipelineRunner';

// ── Memory ────────────────────────────────────────────────────────────────────
export { WorkingMemory } from './memory/WorkingMemory';
export { ContextWindow } from './memory/ContextWindow';

// ── Reasoning ─────────────────────────────────────────────────────────────────
export { ReasoningEngine } from './reasoning/ReasoningEngine';
export { IntentClassifier } from './reasoning/IntentClassifier';

// ── Tools ─────────────────────────────────────────────────────────────────────
export { BlueprintBuilderTool } from './tools/BlueprintBuilderTool';
export { AgentFactoryTool } from './tools/AgentFactoryTool';
export { ValidationTool } from './tools/ValidationTool';

// ── Models ────────────────────────────────────────────────────────────────────
export type { CompilationRequest, CompilationResult, CompilationStatus } from './models/CompilationResult';
export type { PipelineStage, StageId } from './models/PipelineStage';
export { DEFAULT_STAGES, STAGE_IDS } from './models/PipelineStage';
export type { CompilerEvent, CompilerEventType } from './models/CompilerEvent';
export { makeEvent } from './models/CompilerEvent';

// ── Interfaces ────────────────────────────────────────────────────────────────
export type { ICompilerCore, ICompilerProvider, ReasoningOutput } from './interfaces/ICompilerCore';
export type { IPipeline, PipelineContext, StageStatus, PipelineStageDefinition } from './interfaces/IPipeline';
export type { IPlugin, IPluginRegistry } from './interfaces/IPlugin';
export type { IMemoryProvider, MemoryEntry } from './interfaces/IMemoryProvider';
