import type { CompilationRequest, CompilationResult } from '../models/CompilationResult';
import type { PipelineStage } from '../models/PipelineStage';
import type { CompilerEvent } from '../models/CompilerEvent';
import type { ICompilerProvider } from '../interfaces/ICompilerCore';
import { CompilerOrchestrator } from '../orchestrator/CompilerOrchestrator';
import { SimulationProvider } from './SimulationProvider';

// ─── Compiler Core Service ────────────────────────────────────────────────────
// Public façade consumed by the application layer (compiler.service.ts, hooks).
// Manages the singleton orchestrator and provides simple compile + stream APIs.

const SIMULATION_MODE = true;

class CompilerCoreService {
  private orchestrator: CompilerOrchestrator;

  constructor() {
    const provider = this.resolveProvider();
    this.orchestrator = new CompilerOrchestrator(provider);
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Compile a prompt to a Blueprint.
   * Simple fire-and-forget: no streaming events.
   */
  async compile(prompt: string, opts?: {
    sessionId?: string;
    orgId?:     string;
    userId?:    string;
  }): Promise<CompilationResult> {
    const req = this.buildRequest(prompt, opts);
    return this.orchestrator.compile(req);
  }

  /**
   * Compile with streaming callbacks.
   * Events are emitted as each pipeline stage progresses.
   */
  async compileStreaming(
    prompt: string,
    onEvent: (event: CompilerEvent) => void,
    opts?: { sessionId?: string; orgId?: string; userId?: string },
  ): Promise<CompilationResult> {
    const req = this.buildRequest(prompt, opts);
    return this.orchestrator.compileStreaming(req, onEvent);
  }

  /**
   * Abort an in-progress compilation by session ID.
   */
  abort(sessionId: string): void {
    this.orchestrator.abort(sessionId);
  }

  /**
   * Returns the canonical pipeline stage list for UI rendering.
   */
  getPipelineStages(): PipelineStage[] {
    return this.orchestrator.getPipelineStages();
  }

  /**
   * Swap the underlying AI provider at runtime.
   * Call this after the user configures an API key.
   */
  setProvider(provider: ICompilerProvider): void {
    this.orchestrator = new CompilerOrchestrator(provider);
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private buildRequest(prompt: string, opts?: {
    sessionId?: string; orgId?: string; userId?: string;
  }): CompilationRequest {
    return {
      sessionId: opts?.sessionId ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      prompt,
      orgId:     opts?.orgId,
      userId:    opts?.userId,
    };
  }

  private resolveProvider(): ICompilerProvider {
    if (SIMULATION_MODE) return new SimulationProvider();

    // TODO: load from user settings / env
    // Example:
    // if (import.meta.env.VITE_OPENAI_KEY)   return new OpenAIProvider(import.meta.env.VITE_OPENAI_KEY);
    // if (import.meta.env.VITE_ANTHROPIC_KEY) return new AnthropicProvider(import.meta.env.VITE_ANTHROPIC_KEY);

    return new SimulationProvider();  // fallback
  }
}

// ─── Singleton export ─────────────────────────────────────────────────────────

export const compilerCore = new CompilerCoreService();
export { CompilerCoreService, SIMULATION_MODE };
