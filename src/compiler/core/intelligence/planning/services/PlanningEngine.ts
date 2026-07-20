import type { IPlanningEngine, PlanningEngineDeps } from '../interfaces/IPlanningEngine';
import type { IPlanGenerator } from '../interfaces/IPlanGenerator';
import type { IExecutionGraphBuilder } from '../interfaces/IExecutionGraphBuilder';
import type { IPlanValidator } from '../interfaces/IPlanValidator';
import type { IPlanRiskAnalyzer } from '../interfaces/IPlanRiskAnalyzer';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionPlan } from '../models/ExecutionPlan';
import type { ComplexityLevel } from '../../intent/models/ComplexityLevel';
import { PlanGenerator } from './PlanGenerator';
import { ExecutionGraphBuilder } from './ExecutionGraphBuilder';
import { PlanValidator } from './PlanValidator';
import { PlanRiskAnalyzer } from './PlanRiskAnalyzer';
import { InvalidPlanError } from '../errors/InvalidPlanError';
import { PlanningBlockedError } from '../errors/PlanningBlockedError';

// ─── Planning Engine ──────────────────────────────────────────────────────────
// Orchestrates the planning pipeline:
// IntentResult → PlanGenerator → ExecutionGraphBuilder → PlanValidator → PlanRiskAnalyzer → ExecutionPlan.
// Contains no business rules of its own.

const DEFAULT_ID_GENERATOR = (): string => `plan-${Math.random().toString(36).slice(2, 10)}`;
const DEFAULT_CLOCK = (): string => new Date().toISOString();

export class PlanningEngine implements IPlanningEngine {
  readonly id = 'planning-engine-v1';

  async plan(intent: IntentResult, deps?: PlanningEngineDeps): Promise<ExecutionPlan> {
    // ── Validate intent input ──────────────────────────────────────────────────
    if (!intent || !intent.intentId) {
      throw new InvalidPlanError('INVALID_INTENT', 'IntentResult is invalid or missing intentId');
    }

    // ── Resolve components ──────────────────────────────────────────────────────
    const generator    = (deps?.generator    as IPlanGenerator | undefined)       ?? new PlanGenerator();
    const graphBuilder = (deps?.graphBuilder as IExecutionGraphBuilder | undefined) ?? new ExecutionGraphBuilder();
    const validator    = (deps?.validator    as IPlanValidator | undefined)       ?? new PlanValidator();
    const riskAnalyzer = (deps?.riskAnalyzer as IPlanRiskAnalyzer | undefined)     ?? new PlanRiskAnalyzer();
    const idGenerator  = deps?.idGenerator ?? DEFAULT_ID_GENERATOR;
    const clock         = deps?.clock ?? DEFAULT_CLOCK;

    // ── Step 1 — Generate nodes, edges, risks ──────────────────────────────────
    const generated = generator.generate(intent, { idGenerator: deps?.idGenerator, clock: deps?.clock });

    // ── Step 2 — Build execution graph (cycle detection, topo sort) ────────────
    let graph;
    try {
      graph = graphBuilder.build(generated.nodes, generated.edges);
    } catch (err) {
      if (err instanceof Error && err.name === 'CircularDependencyError') {
        throw err;
      }
      throw new InvalidPlanError('GRAPH_BUILD_FAILED', 'Failed to build execution graph');
    }

    // ── Step 3 — Validate ───────────────────────────────────────────────────────
    const validation = validator.validate(graph, intent);

    // ── Step 4 — Analyze risks ──────────────────────────────────────────────────
    const risks = riskAnalyzer.analyze(graph, intent);

    // ── Step 5 — Assemble final plan ────────────────────────────────────────────
    const planId = idGenerator();
    const generatedAt = clock();

    const requiredCapabilities = Array.from(new Set(
      graph.nodes.flatMap(n => n.requiredCapabilities)
    ));
    const suggestedAgentTypes = Array.from(new Set(
      graph.nodes.map(n => n.suggestedAgentType)
    ));
    const suggestedToolCategories = Array.from(new Set(
      graph.nodes.flatMap(n => n.suggestedToolCategories)
    ));

    const estimatedComplexity = this.deriveComplexity(intent, graph.nodes.length);

    const plan: ExecutionPlan = {
      planId,
      requestId:                 intent.requestId,
      organizationId:            intent.organizationId,
      intentId:                  intent.intentId,
      title:                     generated.title,
      objective:                 generated.objective,
      summary:                   generated.summary,
      status:                    validation.recommendedStatus,
      graph,
      requiredCapabilities,
      suggestedAgentTypes,
      suggestedToolCategories,
      requiredDataSources:       generated.requiredDataSources,
      assumptions:               generated.assumptions,
      risks,
      blockers:                  validation.blockers,
      humanApprovalRequirements: generated.humanApprovalRequirements,
      estimatedComplexity,
      confidenceScore:           validation.confidenceScore,
      generatedAt,
      version:                   '1.0',
    };

    // ── Guard: blocked plans throw ──────────────────────────────────────────────
    if (validation.recommendedStatus === 'BLOCKED' && validation.blockers.length > 0) {
      throw new PlanningBlockedError(validation.blockers);
    }

    return plan;
  }

  private deriveComplexity(intent: IntentResult, nodeCount: number): ComplexityLevel {
    if (nodeCount >= 8 || intent.complexity === 'VERY_HIGH') return 'VERY_HIGH';
    if (nodeCount >= 5 || intent.complexity === 'HIGH') return 'HIGH';
    if (nodeCount >= 3 || intent.complexity === 'MEDIUM') return 'MEDIUM';
    return 'LOW';
  }
}
