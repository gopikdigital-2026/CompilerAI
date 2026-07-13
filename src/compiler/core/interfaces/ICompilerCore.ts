import type { Blueprint } from '../../types/blueprint';
import type { CompilationRequest, CompilationResult } from '../models/CompilationResult';
import type { PipelineStage } from '../models/PipelineStage';
import type { CompilerEvent } from '../models/CompilerEvent';

// ─── Core compiler interface ──────────────────────────────────────────────────

export interface ICompilerCore {
  /** Compile a natural-language prompt into a Blueprint. */
  compile(request: CompilationRequest): Promise<CompilationResult>;

  /** Compile with streaming event callbacks. */
  compileStreaming(
    request: CompilationRequest,
    onEvent: (event: CompilerEvent) => void,
  ): Promise<CompilationResult>;

  /** Abort an in-progress compilation. */
  abort(sessionId: string): void;

  /** Return the current pipeline stage labels for display. */
  getPipelineStages(): PipelineStage[];
}

// ─── AI provider interface ─────────────────────────────────────────────────────

export interface ICompilerProvider {
  readonly name: string;
  readonly model: string;
  readonly isSimulation: boolean;

  /** Analyze the prompt and return structured reasoning. */
  reason(prompt: string, context: string): Promise<ReasoningOutput>;

  /** Generate a full Blueprint from reasoning output. */
  generate(reasoning: ReasoningOutput): Promise<Blueprint>;
}

export interface ReasoningOutput {
  intents:        string[];
  entities:       Record<string, string[]>;
  actionVerbs:    string[];
  dataTypes:      string[];
  triggerType:    string;
  services:       string[];
  complexity:     'simple' | 'medium' | 'complex';
  confidence:     number;
  chainOfThought: string[];
}
