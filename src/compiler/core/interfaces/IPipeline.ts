import type { CompilationResult } from '../models/CompilationResult';
import type { PipelineStage } from '../models/PipelineStage';

// ─── Pipeline stage definition ────────────────────────────────────────────────

export type StageStatus = 'pending' | 'running' | 'complete' | 'error' | 'skipped';

// ─── Pipeline interface ───────────────────────────────────────────────────────

export interface IPipeline {
  readonly id:     string;
  readonly stages: PipelineStage[];

  /** Run all stages sequentially and return the final result. */
  run(ctx: PipelineContext): Promise<CompilationResult>;

  /** Return current stage status map. */
  getStatus(): Record<string, StageStatus>;
}

// ─── Execution context passed through stages ──────────────────────────────────

export interface PipelineContext {
  sessionId:  string;
  prompt:     string;
  orgId?:     string;
  userId?:    string;
  abortSignal?: AbortSignal;
  metadata:   Record<string, unknown>;
}
