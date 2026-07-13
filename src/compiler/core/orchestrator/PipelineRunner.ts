import type { IPipeline, PipelineContext, StageStatus } from '../interfaces/IPipeline';
import type { CompilationResult } from '../models/CompilationResult';
import type { PipelineStage } from '../models/PipelineStage';
import { DEFAULT_STAGES, STAGE_IDS } from '../models/PipelineStage';
import type { CompilerEvent } from '../models/CompilerEvent';
import { makeEvent } from '../models/CompilerEvent';
import type { ICompilerProvider } from '../interfaces/ICompilerCore';
import { ReasoningEngine } from '../reasoning/ReasoningEngine';
import { BlueprintBuilderTool } from '../tools/BlueprintBuilderTool';
import { ValidationTool } from '../tools/ValidationTool';
import { WorkingMemory } from '../memory/WorkingMemory';
import { ContextWindow } from '../memory/ContextWindow';

// ─── Pipeline Runner ──────────────────────────────────────────────────────────
// Executes all compilation stages sequentially, emitting events at each step.

export class PipelineRunner implements IPipeline {
  readonly id:     string;
  readonly stages: PipelineStage[];

  private readonly statusMap: Record<string, StageStatus> = {};
  private readonly memory     = new WorkingMemory();
  private readonly builder    = new BlueprintBuilderTool();
  private readonly validator  = new ValidationTool();

  constructor(
    id: string,
    private readonly provider: ICompilerProvider,
    private readonly onEvent: (e: CompilerEvent) => void = () => {},
  ) {
    this.id = id;
    this.stages = DEFAULT_STAGES.map(s => ({ ...s, status: 'pending' as StageStatus }));
    this.stages.forEach(s => { this.statusMap[s.id] = 'pending'; });
  }

  getStatus(): Record<string, StageStatus> {
    return { ...this.statusMap };
  }

  async run(ctx: PipelineContext): Promise<CompilationResult> {
    const startMs = Date.now();
    const contextWindow = new ContextWindow(this.memory, ctx.sessionId);
    const reasoner = new ReasoningEngine(this.provider, contextWindow);

    this.emit(makeEvent('compilation:started', ctx.sessionId, { prompt: ctx.prompt }));

    try {
      // PARSE
      await this.runStage(ctx, STAGE_IDS.PARSE, async () => {
        this.memory.set(ctx.sessionId, 'prompt', ctx.prompt);
        this.memory.set(ctx.sessionId, 'promptLength', ctx.prompt.length);
        this.memory.set(ctx.sessionId, 'promptTokens', Math.ceil(ctx.prompt.length / 4));
      });
      if (ctx.abortSignal?.aborted) return this.aborted(ctx.sessionId, startMs);

      // CLASSIFY
      await this.runStage(ctx, STAGE_IDS.CLASSIFY, async () => {
        // Intentionally part of the reasoning engine — no separate step needed
        this.memory.set(ctx.sessionId, 'classifyReady', true);
      });
      if (ctx.abortSignal?.aborted) return this.aborted(ctx.sessionId, startMs);

      // REASON
      let reasoning;
      await this.runStage(ctx, STAGE_IDS.REASON, async () => {
        reasoning = await reasoner.reason(ctx.prompt);
        this.memory.set(ctx.sessionId, 'reasoning', reasoning);
      });
      if (ctx.abortSignal?.aborted) return this.aborted(ctx.sessionId, startMs);

      // PLAN
      await this.runStage(ctx, STAGE_IDS.PLAN, async () => {
        // Planning is expressed via the reasoning output — stored above
        this.memory.set(ctx.sessionId, 'planReady', true);
      });
      if (ctx.abortSignal?.aborted) return this.aborted(ctx.sessionId, startMs);

      // BUILD
      let blueprint;
      await this.runStage(ctx, STAGE_IDS.BUILD, async () => {
        if (this.provider.isSimulation) {
          blueprint = await this.builder.execute(reasoning!, ctx);
        } else {
          blueprint = await this.provider.generate(reasoning!);
        }
        this.memory.set(ctx.sessionId, 'blueprint', blueprint);
      });
      if (ctx.abortSignal?.aborted) return this.aborted(ctx.sessionId, startMs);

      // VALIDATE
      let validationReport;
      await this.runStage(ctx, STAGE_IDS.VALIDATE, async () => {
        validationReport = await this.validator.execute(blueprint!, ctx);
        this.memory.set(ctx.sessionId, 'validation', validationReport);
      });

      // FINALIZE
      await this.runStage(ctx, STAGE_IDS.FINALIZE, async () => {
        // Nothing extra — cost/time already embedded in blueprint by builder
        this.memory.set(ctx.sessionId, 'finalizedAt', Date.now());
      });

      const durationMs = Date.now() - startMs;
      this.emit(makeEvent('compilation:completed', ctx.sessionId, { durationMs }));

      const result: CompilationResult = {
        sessionId:   ctx.sessionId,
        status:      validationReport!.valid ? 'success' : 'partial',
        blueprint:   blueprint!,
        reasoning:   reasoning!,
        durationMs,
        provider:    this.provider.name,
        model:       this.provider.model,
        warnings:    validationReport!.warnings.map(w => w.message),
        completedAt: new Date().toISOString(),
      };

      this.memory.clear(ctx.sessionId);
      return result;

    } catch (err) {
      const error = err instanceof Error ? err.message : 'Compilation failed';
      this.emit(makeEvent('compilation:error', ctx.sessionId, { error }));
      return {
        sessionId:   ctx.sessionId,
        status:      'error',
        blueprint:   null,
        reasoning:   null,
        durationMs:  Date.now() - startMs,
        provider:    this.provider.name,
        model:       this.provider.model,
        error,
        warnings:    [],
        completedAt: new Date().toISOString(),
      };
    }
  }

  // ── Stage helpers ─────────────────────────────────────────────────────────────

  private async runStage(ctx: PipelineContext, stageId: string, fn: () => Promise<void>): Promise<void> {
    const startMs = Date.now();
    this.statusMap[stageId] = 'running';
    const stage = this.stages.find(s => s.id === stageId)!;
    stage.status    = 'running';
    stage.startedAt = startMs;

    this.emit(makeEvent('stage:started', ctx.sessionId, { stageId, label: stage.label }));

    try {
      await fn();
      const durationMs = Date.now() - startMs;
      this.statusMap[stageId] = 'complete';
      stage.status      = 'complete';
      stage.completedAt = Date.now();
      stage.durationMs  = durationMs;
      this.emit(makeEvent('stage:completed', ctx.sessionId, { stageId, durationMs, status: 'complete' }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Stage failed';
      this.statusMap[stageId] = 'error';
      stage.status = 'error';
      stage.error  = error;
      this.emit(makeEvent('stage:error', ctx.sessionId, { stageId, error }));
      throw err;
    }
  }

  private aborted(sessionId: string, startMs: number): CompilationResult {
    this.emit(makeEvent('compilation:aborted', sessionId, {}));
    return {
      sessionId, status: 'error', blueprint: null, reasoning: null,
      durationMs: Date.now() - startMs, provider: this.provider.name,
      model: this.provider.model, error: 'Aborted', warnings: [],
      completedAt: new Date().toISOString(),
    };
  }

  private emit(event: CompilerEvent): void {
    try { this.onEvent(event); } catch { /* never let event handlers break the pipeline */ }
  }
}
