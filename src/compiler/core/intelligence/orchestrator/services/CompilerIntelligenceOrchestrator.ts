// ─── Compiler Intelligence Orchestrator ─────────────────────────────────────────
// Runs the full intelligence pipeline:
//   ContextRequest → ContextResult → IntentResult → ExecutionPlan → DecisionResult → ConfidenceResult
// Stops on blockers, propagates identifiers, records trace without sensitive data,
// and supports resuming from a valid stage.

import type { ContextResult } from '../../models/ContextResult';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../../planning/models/ExecutionPlan';
import type { DecisionResult } from '../../decision/models/DecisionResult';
import type { ConfidenceResult } from '../../confidence/models/ConfidenceResult';
import type { ConfidenceRequest } from '../../confidence/models/ConfidenceRequest';
import type { DecisionRequest } from '../../decision/models/DecisionRequest';

import { ContextIntelligenceService } from '../../ContextIntelligenceService';
import { IntentEngine } from '../../intent/services/IntentEngine';
import { PlanningEngine } from '../../planning/services/PlanningEngine';
import { DecisionEngine } from '../../decision/services/DecisionEngine';
import { ConfidenceEngine } from '../../confidence/services/ConfidenceEngine';
import { DEFAULT_FACTOR_WEIGHTS } from '../../confidence/rules/ConfidenceRules';

import type {
  CompilerIntelligenceRequest,
  CompilerIntelligenceResult,
  CompilerIntelligenceStatus,
  IntelligenceStage,
  TraceEntry,
} from '../models/CompilerIntelligenceModels';
import type {
  ICompilerIntelligenceOrchestrator,
  CompilerIntelligenceOrchestratorDeps,
} from '../interfaces/ICompilerIntelligenceOrchestrator';
import { InvalidOrchestratorInputError } from '../errors/OrchestratorErrors';
import type { ITelemetryEngine, StageCompleteData, PipelineResults } from '../../telemetry/interfaces/ITelemetryEngine';
import type { IMemoryEngine } from '../../memory/interfaces/IMemoryEngine';
import type { IToolIntelligenceEngine } from '../../tools/interfaces/IToolIntelligenceEngine';

const VERSION = '1.0.0';

const STAGE_ORDER: readonly IntelligenceStage[] = [
  'CONTEXT', 'INTENT', 'PLANNING', 'DECISION', 'CONFIDENCE',
];

export class CompilerIntelligenceOrchestrator implements ICompilerIntelligenceOrchestrator {
  private readonly contextService: ContextIntelligenceService;
  private readonly intentEngine: IntentEngine;
  private readonly planningEngine: PlanningEngine;
  private readonly decisionEngine: DecisionEngine;
  private readonly confidenceEngine: ConfidenceEngine;
  private readonly telemetry: ITelemetryEngine | null;
  private readonly memory: IMemoryEngine | null;
  private readonly tools: IToolIntelligenceEngine | null;

  constructor(private readonly deps: CompilerIntelligenceOrchestratorDeps) {
    this.contextService = new ContextIntelligenceService();
    this.intentEngine = new IntentEngine();
    this.planningEngine = new PlanningEngine();
    this.decisionEngine = new DecisionEngine();
    this.confidenceEngine = new ConfidenceEngine({
      idGenerator: deps.idGenerator, clock: deps.clock, factorWeights: deps.factorWeights,
    });
    this.telemetry = deps.telemetry ?? null;
    this.memory = deps.memory ?? null;
    this.tools = deps.tools ?? null;
  }

  async execute(request: CompilerIntelligenceRequest): Promise<CompilerIntelligenceResult> {
    const executionId = this.deps.idGenerator();
    const startedAt = this.deps.clock();
    const trace: TraceEntry[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    const blockers: string[] = [];

    if (!request.contextRequest?.requestId) {
      throw new InvalidOrchestratorInputError('ContextRequest with requestId is required.', executionId);
    }
    if (!request.memory?.organizationId) {
      throw new InvalidOrchestratorInputError('EnterpriseMemorySnapshot with organizationId is required.', executionId);
    }

    const resumeFrom = request.resumeFrom ?? 'CONTEXT';
    const resumeIdx = STAGE_ORDER.indexOf(resumeFrom);
    if (resumeIdx < 0) {
      throw new InvalidOrchestratorInputError(`Invalid resume stage: ${resumeFrom}`, executionId);
    }

    let contextResult: ContextResult | null = request.existingResults?.contextResult ?? null;
    let intentResult: IntentResult | null = request.existingResults?.intentResult ?? null;
    let executionPlan: ExecutionPlan | null = request.existingResults?.executionPlan ?? null;
    let decisionResult: DecisionResult | null = request.existingResults?.decisionResult ?? null;
    let confidenceResult: ConfidenceResult | null = null;

    let currentStage: IntelligenceStage = resumeFrom;
    let status: CompilerIntelligenceStatus = 'COMPLETED';
    let requiresHumanReview = false;

    try {
      if (this.telemetry) this.telemetry.startExecution(executionId, request.contextRequest.requestId, request.contextRequest.organizationId);

      // ── Stage 1: Context ──────────────────────────────────────────────────────
      if (resumeIdx <= 0) {
        currentStage = 'CONTEXT';
        const stageStart = this.deps.clock();
        if (this.telemetry) this.telemetry.recordStageStart('CONTEXT');
        try {
          contextResult = await this.contextService.analyze(request.contextRequest, request.memory);
          const ctxData: StageCompleteData = { summary: `Context: status=${contextResult.status}, sufficiency=${contextResult.sufficiencyScore}.`, resultId: contextResult.requestId };
          if (this.telemetry) this.telemetry.recordStageComplete('CONTEXT', ctxData);
          trace.push(this.makeTrace('CONTEXT', stageStart, true,
            `Context analyzed: status=${contextResult.status}, sufficiency=${contextResult.sufficiencyScore}.`,
            undefined, contextResult.requestId));
        } catch (err) {
          if (this.telemetry) this.telemetry.recordStageFailure('CONTEXT', [this.safeMessage(err)]);
          trace.push(this.makeTrace('CONTEXT', stageStart, false, this.safeMessage(err)));
          errors.push(this.safeMessage(err));
          return this.build(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'FAILED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
        }
        if (contextResult.status === 'BLOCKED') {
          blockers.push('Context analysis returned BLOCKED status.');
          if (this.telemetry) this.telemetry.recordPipelineEvent('PipelineBlocked', { stage: 'CONTEXT', summary: 'Context analysis returned BLOCKED.', blockers });
          return this.finalize(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'BLOCKED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
        }
        if (contextResult.status === 'NEEDS_DATA') warnings.push('Context requires additional data.');
        if (contextResult.status === 'NEEDS_CLARIFICATION') warnings.push('Context requires clarification.');
      }

      // ── Stage 2: Intent ───────────────────────────────────────────────────────
      if (resumeIdx <= 1) {
        currentStage = 'INTENT';
        if (!contextResult) throw new InvalidOrchestratorInputError('Cannot run intent stage without contextResult.', executionId);
        const stageStart = this.deps.clock();
        if (this.telemetry) this.telemetry.recordStageStart('INTENT', this.intentEngine.id);
        try {
          intentResult = await this.intentEngine.resolve(contextResult, undefined, request.contextRequest);
          const intentData: StageCompleteData = { summary: `Intent: primary=${intentResult.primaryIntent}, status=${intentResult.status}.`, resultId: intentResult.intentId };
          if (this.telemetry) this.telemetry.recordStageComplete('INTENT', intentData);
          trace.push(this.makeTrace('INTENT', stageStart, true,
            `Intent resolved: primary=${intentResult.primaryIntent}, status=${intentResult.status}.`,
            this.intentEngine.id, intentResult.intentId));
        } catch (err) {
          if (this.telemetry) this.telemetry.recordStageFailure('INTENT', [this.safeMessage(err)]);
          trace.push(this.makeTrace('INTENT', stageStart, false, this.safeMessage(err)));
          errors.push(this.safeMessage(err));
          return this.build(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'FAILED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
        }
        if (intentResult.status === 'BLOCKED') {
          blockers.push('Intent engine returned BLOCKED status.');
          if (this.telemetry) this.telemetry.recordPipelineEvent('PipelineBlocked', { stage: 'INTENT', summary: 'Intent engine returned BLOCKED.', blockers });
          return this.finalize(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'BLOCKED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
        }
        if (intentResult.requiresHumanApproval) { requiresHumanReview = true; if (this.telemetry) this.telemetry.recordPipelineEvent('HumanReviewRequested', { stage: 'INTENT', summary: 'Intent requires human approval.' }); }
        if (intentResult.requiresClarification) warnings.push('Intent requires clarification.');
      }

      // ── Stage 3: Planning ──────────────────────────────────────────────────────
      if (resumeIdx <= 2) {
        currentStage = 'PLANNING';
        if (!intentResult) throw new InvalidOrchestratorInputError('Cannot run planning stage without intentResult.', executionId);
        const stageStart = this.deps.clock();
        if (this.telemetry) this.telemetry.recordStageStart('PLANNING', this.planningEngine.id);
        try {
          executionPlan = await this.planningEngine.plan(intentResult, {
            idGenerator: this.deps.idGenerator, clock: this.deps.clock,
          });
          const planData: StageCompleteData = { summary: `Plan: status=${executionPlan.status}, nodes=${executionPlan.graph.nodes.length}.`, resultId: executionPlan.planId, riskLevel: this.maxRisk(executionPlan) };
          if (this.telemetry) this.telemetry.recordStageComplete('PLANNING', planData);
          trace.push(this.makeTrace('PLANNING', stageStart, true,
            `Plan generated: status=${executionPlan.status}, nodes=${executionPlan.graph.nodes.length}.`,
            this.planningEngine.id, executionPlan.planId));
        } catch (err) {
          if (this.telemetry) this.telemetry.recordStageFailure('PLANNING', [this.safeMessage(err)]);
          trace.push(this.makeTrace('PLANNING', stageStart, false, this.safeMessage(err)));
          errors.push(this.safeMessage(err));
          return this.build(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'FAILED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
        }
        if (executionPlan.status === 'BLOCKED' || executionPlan.status === 'INVALID') {
          blockers.push(`Plan status is ${executionPlan.status}.`);
          if (this.telemetry) this.telemetry.recordPipelineEvent('PipelineBlocked', { stage: 'PLANNING', summary: `Plan status is ${executionPlan.status}.`, blockers });
          return this.finalize(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'BLOCKED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
        }
        if (executionPlan.status === 'NEEDS_DATA') warnings.push('Plan requires additional data.');
        if (executionPlan.status === 'NEEDS_CLARIFICATION') warnings.push('Plan requires clarification.');
        if (executionPlan.humanApprovalRequirements.length > 0) requiresHumanReview = true;
      }

      // ── Stage 4: Decision ─────────────────────────────────────────────────────
      if (resumeIdx <= 3) {
        currentStage = 'DECISION';
        if (!executionPlan) throw new InvalidOrchestratorInputError('Cannot run decision stage without executionPlan.', executionId);
        const stageStart = this.deps.clock();
        if (this.telemetry) this.telemetry.recordStageStart('DECISION', this.decisionEngine.id);
        try {
          const decisionReq: DecisionRequest = {
            executionPlan, evaluationPreferences: {}, riskTolerance: request.riskTolerance,
            availableConstraints: [], requestedDecisionScope: 'FULL', requestedAt: this.deps.clock(),
          };
          decisionResult = await this.decisionEngine.decide(decisionReq, {
            idGenerator: this.deps.idGenerator, clock: this.deps.clock,
          });
          const decData: StageCompleteData = { summary: `Decision: status=${decisionResult.status}, decisions=${decisionResult.decisions.length}.`, resultId: decisionResult.decisionResultId };
          if (this.telemetry) this.telemetry.recordStageComplete('DECISION', decData);
          trace.push(this.makeTrace('DECISION', stageStart, true,
            `Decision made: status=${decisionResult.status}, decisions=${decisionResult.decisions.length}.`,
            this.decisionEngine.id, decisionResult.decisionResultId));
        } catch (err) {
          if (this.telemetry) this.telemetry.recordStageFailure('DECISION', [this.safeMessage(err)]);
          trace.push(this.makeTrace('DECISION', stageStart, false, this.safeMessage(err)));
          errors.push(this.safeMessage(err));
          return this.build(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'FAILED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
        }
        if (decisionResult.status === 'BLOCKED' || decisionResult.status === 'INVALID') {
          blockers.push(`Decision status is ${decisionResult.status}.`);
          if (this.telemetry) this.telemetry.recordPipelineEvent('PipelineBlocked', { stage: 'DECISION', summary: `Decision status is ${decisionResult.status}.`, blockers });
          if (decisionResult.status === 'INVALID' && this.telemetry) this.telemetry.recordPipelineEvent('DecisionRejected', { stage: 'DECISION', summary: 'Decision result rejected as INVALID.' });
          return this.finalize(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'BLOCKED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
        }
        if (decisionResult.status === 'NEEDS_DATA') warnings.push('Decision requires additional data.');
        if (decisionResult.status === 'NEEDS_CLARIFICATION') warnings.push('Decision requires clarification.');
        if (decisionResult.status === 'REQUIRES_APPROVAL' || decisionResult.requiresReplanning) requiresHumanReview = true;
      }

      // ── Stage 5: Confidence ───────────────────────────────────────────────────
      if (resumeIdx <= 4) {
        currentStage = 'CONFIDENCE';
        const stageStart = this.deps.clock();
        if (this.telemetry) this.telemetry.recordStageStart('CONFIDENCE');
        try {
          const confReq: ConfidenceRequest = {
            requestId: request.contextRequest.requestId,
            organizationId: request.contextRequest.organizationId,
            contextResult: contextResult ?? undefined,
            intentResult: intentResult ?? undefined,
            executionPlan: executionPlan ?? undefined,
            decisionResult: decisionResult ?? undefined,
            assessmentScope: 'FULL_PIPELINE',
            minimumConfidenceThreshold: request.minimumConfidenceThreshold,
            riskTolerance: request.riskTolerance,
            requestedAt: this.deps.clock(),
          };
          confidenceResult = this.confidenceEngine.evaluate(confReq);
          const confData: StageCompleteData = { summary: `Confidence: score=${confidenceResult.overallScore}, status=${confidenceResult.status}.`, resultId: confidenceResult.confidenceResultId, confidenceScore: confidenceResult.overallScore };
          if (this.telemetry) { this.telemetry.recordStageComplete('CONFIDENCE', confData); this.telemetry.recordPipelineEvent('ConfidenceCalculated', { stage: 'CONFIDENCE', summary: `Confidence: ${confidenceResult.overallScore}/100.`, confidenceScore: confidenceResult.overallScore }); }
          trace.push(this.makeTrace('CONFIDENCE', stageStart, true,
            `Confidence evaluated: score=${confidenceResult.overallScore}, status=${confidenceResult.status}.`,
            undefined, confidenceResult.confidenceResultId));
        } catch (err) {
          if (this.telemetry) this.telemetry.recordStageFailure('CONFIDENCE', [this.safeMessage(err)]);
          trace.push(this.makeTrace('CONFIDENCE', stageStart, false, this.safeMessage(err)));
          errors.push(this.safeMessage(err));
          return this.build(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'FAILED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
        }
        if (confidenceResult.blocked) {
          blockers.push(...confidenceResult.recommendedActions);
          if (this.telemetry) this.telemetry.recordPipelineEvent('PipelineBlocked', { stage: 'CONFIDENCE', summary: 'Confidence evaluation blocked.', blockers: confidenceResult.recommendedActions });
          return this.finalize(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'BLOCKED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
        }
        if (confidenceResult.requiresHumanReview) { requiresHumanReview = true; if (this.telemetry) this.telemetry.recordPipelineEvent('HumanReviewRequested', { stage: 'CONFIDENCE', summary: 'Confidence evaluation requires human review.' }); }
        if (confidenceResult.status === 'NEEDS_DATA') status = 'NEEDS_DATA';
        else if (confidenceResult.status === 'NEEDS_CLARIFICATION') status = 'NEEDS_CLARIFICATION';
        else if (confidenceResult.status === 'HUMAN_REVIEW_REQUIRED') status = 'REQUIRES_APPROVAL';
        else if (confidenceResult.status === 'INVALID') { status = 'FAILED'; errors.push('Confidence evaluation returned INVALID.'); }
      }

      if (status === 'COMPLETED' && requiresHumanReview) status = 'REQUIRES_APPROVAL';

      return this.finalize(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, status, trace, warnings, errors, blockers, requiresHumanReview, startedAt);

    } catch (err) {
      if (err instanceof InvalidOrchestratorInputError) throw err;
      errors.push(this.safeMessage(err));
      return this.finalize(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, 'FAILED', trace, warnings, errors, blockers, requiresHumanReview, startedAt);
    }
  }

  private makeTrace(stage: IntelligenceStage, startedAt: string, success: boolean, summary: string, engineId?: string, resultId?: string): TraceEntry {
    return { stage, startedAt, completedAt: this.deps.clock(), success, summary, engineId, resultId };
  }

  private safeMessage(err: unknown): string {
    if (err instanceof Error) return `Stage failed: ${err.name}`;
    return 'Stage failed: unknown error';
  }

  private maxRisk(plan: ExecutionPlan): string | undefined {
    if (plan.risks.length === 0) return undefined;
    const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    let maxIdx = 0;
    for (const r of plan.risks) {
      const idx = order.indexOf(r.level);
      if (idx > maxIdx) maxIdx = idx;
    }
    return order[maxIdx];
  }

  private finalize(
    executionId: string, request: CompilerIntelligenceRequest,
    contextResult: ContextResult | null, intentResult: IntentResult | null,
    executionPlan: ExecutionPlan | null, decisionResult: DecisionResult | null,
    confidenceResult: ConfidenceResult | null, currentStage: IntelligenceStage,
    status: CompilerIntelligenceStatus, trace: TraceEntry[], warnings: string[],
    errors: string[], blockers: string[], requiresHumanReview: boolean, startedAt: string,
  ): CompilerIntelligenceResult {
    if (this.telemetry) {
      const results: PipelineResults = { contextResult, intentResult, executionPlan, decisionResult, confidenceResult };
      this.telemetry.finalizeExecution(status, requiresHumanReview, results);
    }
    if (this.memory) {
      try {
        this.memory.write({
          organizationId: request.contextRequest.organizationId,
          executionId,
          type: 'EXECUTION',
          content: `Execution ${executionId} ${status} after ${trace.length} stages.`,
          source: 'orchestrator',
          confidence: confidenceResult?.overallScore ?? 50,
          relevance: 80,
          sensitivity: 'INTERNAL',
          consentGranted: true,
          tags: ['pipeline', status],
          metadata: { stageCount: trace.length, warningCount: warnings.length, errorCount: errors.length },
          executionStatus: status,
          completedStages: trace.filter(t => t.success).map(t => t.stage),
          finalConfidence: confidenceResult?.overallScore ?? undefined,
          requiredHumanReview: requiresHumanReview,
        });
      } catch { /* memory write failures must not break the pipeline */ }
    }
    if (this.tools && intentResult && confidenceResult) {
      try {
        this.tools.selectTools(
          {
            organizationId: request.contextRequest.organizationId,
            contextResult, intentResult, executionPlan, decisionResult, confidenceResult,
            riskTolerance: request.riskTolerance,
          },
          {
            policyId: this.deps.idGenerator(),
            organizationId: request.contextRequest.organizationId,
            allowedToolIds: [],
            deniedToolIds: [],
            grantedPermissions: ['READ_PUBLIC', 'READ_INTERNAL', 'EXECUTE'],
            maxDataSensitivity: 'INTERNAL',
            consentGranted: true,
            orgTier: 'enterprise',
            allowFallback: true,
          },
        );
      } catch { /* tool selection failures must not break the pipeline */ }
    }
    return this.build(executionId, request, contextResult, intentResult, executionPlan, decisionResult, confidenceResult, currentStage, status, trace, warnings, errors, blockers, requiresHumanReview, startedAt);
  }

  private build(
    executionId: string, request: CompilerIntelligenceRequest,
    contextResult: ContextResult | null, intentResult: IntentResult | null,
    executionPlan: ExecutionPlan | null, decisionResult: DecisionResult | null,
    confidenceResult: ConfidenceResult | null, currentStage: IntelligenceStage,
    status: CompilerIntelligenceStatus, trace: TraceEntry[], warnings: string[],
    errors: string[], blockers: string[], requiresHumanReview: boolean, startedAt: string,
  ): CompilerIntelligenceResult {
    return {
      executionId, requestId: request.contextRequest.requestId,
      organizationId: request.contextRequest.organizationId,
      contextResult, intentResult, executionPlan, decisionResult, confidenceResult,
      currentStage, status, trace, warnings, errors, blockers, requiresHumanReview,
      startedAt, completedAt: this.deps.clock(), version: VERSION,
    };
  }
}

export { DEFAULT_FACTOR_WEIGHTS };
