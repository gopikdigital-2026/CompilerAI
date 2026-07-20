import type { IPlanGenerator, PlanGenerationOutput } from '../interfaces/IPlanGenerator';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { PlanNode } from '../models/PlanNode';
import type { PlanEdge } from '../models/PlanEdge';
import type { PlanRisk } from '../models/PlanRisk';
import type { HumanApprovalRequirement } from '../models/HumanApprovalRequirement';
import type { DataClassification } from '../../models/ContextSource';
import { blueprintForIntent, NodeBlueprint } from '../rules/PlanningRules';
import { deriveDependencyType, isConditional } from '../rules/DependencyRules';
import { evaluateApproval } from '../rules/HumanApprovalRules';
import { classifyRisks } from '../rules/RiskClassificationRules';

// ─── Plan Generator ───────────────────────────────────────────────────────────
// Transforms an IntentResult into plan nodes, edges, risks and approval
// requirements using deterministic rules. No randomness.

export interface PlanGeneratorDeps {
  idGenerator?: () => string;
  clock?:       () => string;
}

const DEFAULT_ID_GENERATOR = (): string => `node-${Math.random().toString(36).slice(2, 10)}`;
const DEFAULT_CLOCK = (): string => new Date().toISOString();

export class PlanGenerator implements IPlanGenerator {
  readonly id = 'plan-generator-v1';

  generate(intent: IntentResult, deps?: PlanGeneratorDeps): PlanGenerationOutput {
    const idGen = deps?.idGenerator ?? DEFAULT_ID_GENERATOR;
    const clock  = deps?.clock ?? DEFAULT_CLOCK;
    void clock;   // reserved for future timestamped metadata

    const blueprint = blueprintForIntent(
      intent.primaryIntent, intent.secondaryIntents, intent.businessArea,
    );

    // ── Build nodes ─────────────────────────────────────────────────────────────
    const maxClassification = this.maxClassification(intent);
    const nodes: PlanNode[] = blueprint.nodes.map((bp, index) => {
      const nodeId = idGen();
      return this.buildNode(bp, nodeId, intent, index, maxClassification);
    });

    // ── Build edges ─────────────────────────────────────────────────────────────
    const edges: PlanEdge[] = blueprint.edges.map(([src, tgt, depType, required], idx) => {
      const sourceNode = nodes[src];
      const targetNode = nodes[tgt];
      const dependencyType = depType === 'FINISH_TO_START'
        ? deriveDependencyType(sourceNode.type, targetNode.type)
        : depType;
      return {
        edgeId: `edge-${idx}`,
        sourceNodeId: sourceNode.nodeId,
        targetNodeId: targetNode.nodeId,
        dependencyType,
        condition: isConditional(sourceNode.type, targetNode.type) ? 'Conditional on prior output' : undefined,
        required,
      };
    });

    // ── Wire dependencies into nodes ──────────────────────────────────────────
    for (const edge of edges) {
      const target = nodes.find(n => n.nodeId === edge.targetNodeId);
      if (target && !target.dependencies.includes(edge.sourceNodeId)) {
        target.dependencies.push(edge.sourceNodeId);
      }
    }

    // ── Evaluate human approval ─────────────────────────────────────────────────
    const humanApprovalRequirements: HumanApprovalRequirement[] = [];
    for (const node of nodes) {
      const decision = evaluateApproval(node, intent);
      if (decision.requiresApproval) {
        node.requiresHumanApproval = true;
        node.approvalReason = decision.reason;
        humanApprovalRequirements.push({
          nodeId:    node.nodeId,
          reason:    decision.reason!,
          rationale: decision.rationale!,
        });
      }
    }

    // ── Build a temporary graph for risk analysis ───────────────────────────────
    const tempGraph = { nodes, edges, entryNodeIds: [], terminalNodeIds: [], parallelGroups: [], topologicalOrder: [] };
    const risks: PlanRisk[] = classifyRisks(tempGraph, intent);

    return {
      nodes, edges, risks, humanApprovalRequirements,
      requiredDataSources: blueprint.requiredDataSources,
      assumptions: intent.assumptions,
      title:      blueprint.title,
      objective:  blueprint.objective,
      summary:    blueprint.summary,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private buildNode(
    bp: NodeBlueprint, nodeId: string, intent: IntentResult,
    index: number, maxClassification: DataClassification,
  ): PlanNode {
    return {
      nodeId,
      type: bp.type,
      title: bp.title,
      description: bp.description,
      objective: bp.objective,
      dependencies: [],
      inputs: this.buildInputs(bp, intent, maxClassification),
      expectedOutputs: this.buildOutputs(bp, maxClassification),
      requiredCapabilities: bp.requiredCapabilities,
      suggestedAgentType: bp.suggestedAgentType,
      suggestedToolCategories: bp.suggestedToolCategories,
      requiresHumanApproval: false,
      riskLevel: bp.riskLevel,
      estimatedComplexity: bp.estimatedComplexity,
      canRunInParallel: bp.canRunInParallel,
      executionPriority: bp.executionPriority,
      status: 'DRAFT',
      metadata: { blueprintIndex: index },
    };
  }

  private buildInputs(
    bp: NodeBlueprint, intent: IntentResult, maxClassification: DataClassification,
  ): PlanNode['inputs'] {
    const inputs: PlanNode['inputs'] = [];

    if (bp.type === 'DATA_RETRIEVAL') {
      for (const source of intent.requiredCapabilities.includes('EXTERNAL_DATA_ACCESS')
        ? ['crm', 'erp', 'metrics'] : ['memory']) {
        inputs.push({
          name: `data.${source}`,
          description: `Data from ${source}`,
          source,
          available: false,
          classification: maxClassification,
        });
      }
    }

    if (bp.type === 'MEMORY_RETRIEVAL') {
      inputs.push({
        name: 'memory.entries',
        description: 'Enterprise memory entries',
        source: 'memory',
        available: true,
        classification: 'INTERNAL',
      });
    }

    if (bp.type === 'ANALYSIS' || bp.type === 'FORECASTING' || bp.type === 'OPTIMIZATION') {
      inputs.push({
        name: 'data.retrieved',
        description: 'Retrieved enterprise data',
        available: false,
        classification: maxClassification,
      });
    }

    return inputs;
  }

  private buildOutputs(
    bp: NodeBlueprint, maxClassification: DataClassification,
  ): PlanNode['expectedOutputs'] {
    return [{
      name: `output.${bp.type.toLowerCase()}`,
      description: bp.objective,
      classification: maxClassification,
    }];
  }

  private maxClassification(intent: IntentResult): DataClassification {
    const classes = [
      ...intent.affectedEntities.map(e => e.classification),
      ...intent.constraints.map(c => c.classification),
    ] as DataClassification[];
    const order: DataClassification[] = ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'];
    return classes.reduce<DataClassification>(
      (max, c) => order.indexOf(c) > order.indexOf(max) ? c : max,
      'PUBLIC',
    );
  }
}
