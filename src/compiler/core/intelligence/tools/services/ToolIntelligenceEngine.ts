// ─── ToolIntelligenceEngine ─────────────────────────────────────────────────────
// Main entry point — orchestrates discovery, eligibility, selection, risk, and plan building.

import type { ToolExecutionPlan } from '../models/ToolExecutionPlan';
import type { ToolCandidate } from '../models/ToolCandidate';
import type { ToolSelection } from '../models/ToolSelection';
import type { ToolEvent } from '../models/ToolEvent';
import type { ToolPolicy } from '../models/ToolPolicy';
import type { ToolIntelligenceEngineDeps, ToolSelectionContext, IToolIntelligenceEngine } from '../interfaces/IToolIntelligenceEngine';
import type { IToolRegistry } from '../interfaces/IToolRegistry';
import { ToolDiscoveryService } from './ToolDiscoveryService';
import { ToolEligibilityValidator } from './ToolEligibilityValidator';
import { ToolSelector } from './ToolSelector';
import { ToolRiskAnalyzer } from './ToolRiskAnalyzer';
import { ToolPlanBuilder } from './ToolPlanBuilder';

export class ToolIntelligenceEngine implements IToolIntelligenceEngine {
  readonly id = 'tool-intelligence-engine-v1';

  private readonly registry: IToolRegistry;
  private readonly discoveryService: ToolDiscoveryService;
  private readonly eligibilityValidator: ToolEligibilityValidator;
  private readonly selector: ToolSelector;
  private readonly riskAnalyzer: ToolRiskAnalyzer;
  private readonly planBuilder: ToolPlanBuilder;
  private readonly events: ToolEvent[] = [];

  constructor(private readonly deps: ToolIntelligenceEngineDeps) {
    this.registry = deps.registry;
    this.discoveryService = new ToolDiscoveryService(this.registry);
    this.eligibilityValidator = new ToolEligibilityValidator();
    this.selector = new ToolSelector(deps.idGenerator);
    this.riskAnalyzer = new ToolRiskAnalyzer(deps.idGenerator);
    this.planBuilder = new ToolPlanBuilder(deps.idGenerator, deps.clock);
  }

  selectTools(context: ToolSelectionContext, policy: ToolPolicy): ToolExecutionPlan {
    // 1. Discover tools matching the context
    const discovered = this.discoveryService.discover(context);
    if (discovered.length === 0) {
      this.emitEvent('ToolPlanBlocked', context, null, null, 'No tools discovered for the given context.');
      return this.emptyPlan(context, ['No tools discovered.']);
    }

    // 2. Validate eligibility
    const candidates: ToolCandidate[] = discovered.map(tool =>
      this.eligibilityValidator.validate(tool, context, policy),
    );

    const eligible = candidates.filter(c => c.eligible);
    const rejected = candidates.filter(c => !c.eligible);

    for (const r of rejected) {
      this.emitEvent('ToolRejected', context, r.tool.toolId, r.tool.category, `Tool ${r.tool.toolId} rejected: ${r.ineligibilityReasons.join('; ')}`);
    }

    if (eligible.length === 0) {
      this.emitEvent('ToolPlanBlocked', context, null, null, 'No eligible tools after validation.');
      return this.emptyPlan(context, ['No eligible tools after validation.']);
    }

    // 3. Select and rank
    const selections: ToolSelection[] = this.selector.select(candidates, context, policy);
    for (const sel of selections) {
      this.emitEvent('ToolSelected', context, sel.toolId, null, `Tool ${sel.toolName} selected at rank ${sel.rank} (score: ${sel.totalScore}).`);
    }

    // 4. Analyze risk
    const selectedTools = candidates
      .filter(c => selections.some(s => s.toolId === c.tool.toolId))
      .map(c => c.tool);
    const riskAssessment = this.riskAnalyzer.analyze(selectedTools, context);

    // 5. Build execution plan
    const plan = this.planBuilder.build(selections, candidates, riskAssessment, context);

    // 6. Record fallback events
    for (const step of plan.steps) {
      if (step.isFallback) {
        this.emitEvent('ToolFallbackUsed', context, step.toolId, null, `Fallback: ${step.toolName} replaces ${step.selection.fallbackForToolId}.`);
      }
    }

    this.emitEvent('ToolPlanBuilt', context, null, null, `Tool plan built: ${plan.totalTools} tools, status ${plan.status}.`);

    return plan;
  }

  getRegistry(): IToolRegistry {
    return this.registry;
  }

  getEvents(): ToolEvent[] {
    return [...this.events];
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private emptyPlan(context: ToolSelectionContext, warnings: string[]): ToolExecutionPlan {
    return {
      planId: this.deps.idGenerator(),
      executionId: '',
      organizationId: context.organizationId,
      status: 'EMPTY',
      steps: [],
      riskAssessment: this.riskAnalyzer.analyze([], context),
      totalTools: 0,
      fallbacksUsed: 0,
      warnings,
      createdAt: this.deps.clock(),
      version: '1.0.0',
    };
  }

  private emitEvent(
    eventType: ToolEvent['eventType'],
    context: ToolSelectionContext,
    toolId: string | null,
    toolCategory: ToolEvent['toolCategory'],
    summary: string,
  ): void {
    this.events.push({
      eventId: this.deps.idGenerator(),
      eventType,
      executionId: '',
      organizationId: context.organizationId,
      timestamp: this.deps.clock(),
      summary,
      toolId,
      toolCategory,
      metadata: {},
    });
  }
}
