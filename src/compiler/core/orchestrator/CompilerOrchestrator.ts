import type { ICompilerCore } from '../interfaces/ICompilerCore';
import type { CompilationRequest, CompilationResult } from '../models/CompilationResult';
import type { PipelineStage } from '../models/PipelineStage';
import { DEFAULT_STAGES } from '../models/PipelineStage';
import type { CompilerEvent } from '../models/CompilerEvent';
import type { ICompilerProvider } from '../interfaces/ICompilerCore';
import { PipelineRunner } from './PipelineRunner';

// ─── Compiler Orchestrator ─────────────────────────────────────────────────────
// Top-level entry point. Creates a PipelineRunner per compilation request,
// manages abort controllers, and exposes the ICompilerCore interface.

export class CompilerOrchestrator implements ICompilerCore {
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(private readonly provider: ICompilerProvider) {}

  // ── ICompilerCore ─────────────────────────────────────────────────────────────

  async compile(request: CompilationRequest): Promise<CompilationResult> {
    return this.compileStreaming(request, () => {});
  }

  async compileStreaming(
    request: CompilationRequest,
    onEvent: (event: CompilerEvent) => void,
  ): Promise<CompilationResult> {
    const abortController = new AbortController();
    this.abortControllers.set(request.sessionId, abortController);

    const runner = new PipelineRunner(request.sessionId, this.provider, onEvent);

    const result = await runner.run({
      sessionId:   request.sessionId,
      prompt:      request.prompt,
      orgId:       request.orgId,
      userId:      request.userId,
      abortSignal: abortController.signal,
      metadata:    {},
    });

    this.abortControllers.delete(request.sessionId);
    return result;
  }

  abort(sessionId: string): void {
    const ctrl = this.abortControllers.get(sessionId);
    if (ctrl) {
      ctrl.abort();
      this.abortControllers.delete(sessionId);
    }
  }

  getPipelineStages(): PipelineStage[] {
    return DEFAULT_STAGES.map(s => ({ ...s, status: 'pending' as const }));
  }
}
