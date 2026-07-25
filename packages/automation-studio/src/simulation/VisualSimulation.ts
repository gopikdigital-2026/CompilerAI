import type { Workflow } from '../models/WorkflowDefinition.js';
import type { WorkflowNode, WorkflowConnection } from '../models/WorkflowModels.js';

export type SimulationNodeState = 'idle' | 'running' | 'completed' | 'failed' | 'skipped';
export type SimulationHighlight = 'normal' | 'active' | 'success' | 'failure' | 'warning' | 'dimmed';

export interface VisualSimulationNode {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  state: SimulationNodeState;
  highlight: SimulationHighlight;
  estimatedDurationMs: number;
  estimatedCost: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  decisions: string[];
  errors: string[];
  warnings: string[];
}

export interface VisualSimulationEdge {
  from: string;
  to: string;
  active: boolean;
  label: string | null;
}

export interface VisualSimulationResult {
  dryRun: true;
  workflowId: string;
  workflowName: string;
  nodes: VisualSimulationNode[];
  edges: VisualSimulationEdge[];
  executionPath: string[];
  totalEstimatedDurationMs: number;
  totalEstimatedCost: number;
  averageConfidence: number;
  preflightErrors: string[];
  preflightWarnings: string[];
  requiredConnectors: string[];
  missingConnectors: string[];
  requiredPermissions: string[];
  success: boolean;
}

export interface SimulationStep {
  nodeId: string;
  stepIndex: number;
  timestamp: string;
}

const COST_TABLE: Record<string, number> = {
  trigger: 0,
  ai_agent: 0.02,
  ai_prompt: 0.02,
  decision: 0,
  condition: 0,
  human_approval: 0,
  tool: 0.05,
  loop: 0.01,
  delay: 0,
  wait: 0,
  notification: 0.001,
  end: 0,
  gmail_trigger: 0,
  gmail_send: 0,
  drive_upload: 0,
  drive_list: 0,
  calendar_create: 0,
  calendar_list: 0,
  github_create_issue: 0,
  github_list_issues: 0,
  http_request: 0.0001,
  webhook_trigger: 0,
  variable_set: 0,
  variable_get: 0,
  retry: 0,
};

const DURATION_TABLE: Record<string, number> = {
  trigger: 0,
  ai_agent: 2000,
  ai_prompt: 2000,
  decision: 1,
  condition: 1,
  human_approval: 86400000,
  tool: 1000,
  loop: 500,
  delay: 1000,
  wait: 1000,
  notification: 500,
  end: 0,
  gmail_trigger: 0,
  gmail_send: 1500,
  gmail_trigger_run: 1500,
  drive_upload: 2000,
  drive_list: 2000,
  calendar_create: 2000,
  calendar_list: 2000,
  github_create_issue: 1500,
  github_list_issues: 1500,
  http_request: 3000,
  webhook_trigger: 0,
  variable_set: 0,
  variable_get: 0,
  retry: 0,
};

const CONNECTOR_PREFIXES = ['gmail', 'drive', 'calendar', 'github', 'http', 'webhook', 'ai'];

/** Returns the node type as a broad string (runtime may include connector types). */
function typeOf(node: WorkflowNode): string {
  return node.type as string;
}

function costFor(node: WorkflowNode): number {
  return COST_TABLE[typeOf(node)] ?? 0;
}

function durationFor(node: WorkflowNode): number {
  const t = typeOf(node);
  if (t === 'delay' || t === 'wait') {
    const explicit = node.config['durationMs'];
    if (typeof explicit === 'number') return explicit;
  }
  if (t === 'loop') {
    const maxIter = node.config['maxIterations'];
    const iterations = typeof maxIter === 'number' ? maxIter : 100;
    return DURATION_TABLE['loop'] * iterations;
  }
  if (t === 'gmail_trigger') return 0; // trigger — zero duration
  return DURATION_TABLE[t] ?? 0;
}

function highlightFor(state: SimulationNodeState): SimulationHighlight {
  switch (state) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'failure';
    case 'running':
      return 'active';
    case 'skipped':
      return 'dimmed';
    default:
      return 'normal';
  }
}

function buildAdjacency(
  connections: WorkflowConnection[],
): Map<string, WorkflowConnection[]> {
  const adj = new Map<string, WorkflowConnection[]>();
  for (const conn of connections) {
    const list = adj.get(conn.fromNodeId) ?? [];
    list.push(conn);
    adj.set(conn.fromNodeId, list);
  }
  return adj;
}

export class VisualSimulation {
  constructor() {}

  simulate(
    workflow: Workflow,
    options: { maxSteps?: number; highlightMode?: boolean } = {},
  ): VisualSimulationResult {
    const maxSteps = options.maxSteps ?? 100;
    const highlightMode = options.highlightMode ?? true;

    const preflight = this.preflightCheck(workflow);
    const costEst = this.estimateCost(workflow);
    const durEst = this.estimateDuration(workflow);
    const costMap = new Map(costEst.perNode.map((p) => [p.nodeId, p.cost]));
    const durMap = new Map(durEst.perNode.map((p) => [p.nodeId, p.durationMs]));

    const trigger = workflow.nodes.find((n) => {
      const t = typeOf(n);
      return t === 'trigger' || t === 'webhook_trigger' || t === 'gmail_trigger';
    });
    const adj = buildAdjacency(workflow.connections);
    const visited = new Set<string>();
    const executionPath: string[] = [];

    const simNodes: VisualSimulationNode[] = [];
    const simEdges: VisualSimulationEdge[] = workflow.connections.map((c) => ({
      from: c.fromNodeId,
      to: c.toNodeId,
      active: false,
      label: c.label,
    }));

    if (!trigger) {
      for (const node of workflow.nodes) {
        simNodes.push(this.idleNode(node, costMap.get(node.id) ?? 0, durMap.get(node.id) ?? 0));
      }
      return {
        dryRun: true,
        workflowId: workflow.id,
        workflowName: workflow.name,
        nodes: simNodes,
        edges: simEdges,
        executionPath,
        totalEstimatedDurationMs: durEst.totalMs,
        totalEstimatedCost: costEst.totalCost,
        averageConfidence: 0,
        preflightErrors: preflight.errors,
        preflightWarnings: preflight.warnings,
        requiredConnectors: this.getRequiredConnectors(workflow),
        missingConnectors: [],
        requiredPermissions: [],
        success: false,
      };
    }

    const queue: string[] = [trigger.id];
    let stepCount = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;

    while (queue.length > 0 && stepCount < maxSteps) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      stepCount++;

      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) continue;
      executionPath.push(nodeId);

      const confidence = this.confidenceFor(node);
      totalConfidence += confidence;
      confidenceCount++;

      const state: SimulationNodeState = 'completed';
      simNodes.push({
        nodeId: node.id,
        nodeLabel: node.label,
        nodeType: node.type,
        state,
        highlight: highlightMode ? highlightFor(state) : 'normal',
        estimatedDurationMs: durMap.get(node.id) ?? 0,
        estimatedCost: costMap.get(node.id) ?? 0,
        inputs: {},
        outputs: {},
        decisions: this.decisionsFor(node),
        errors: [],
        warnings: [],
      });

      const neighbors = adj.get(nodeId) ?? [];
      for (const edge of neighbors) {
        if (!visited.has(edge.toNodeId)) {
          const simEdge = simEdges.find(
            (e) => e.from === edge.fromNodeId && e.to === edge.toNodeId,
          );
          if (simEdge) simEdge.active = true;
          queue.push(edge.toNodeId);
        }
      }
    }

    // Mark unvisited nodes as skipped.
    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        const state: SimulationNodeState = 'skipped';
        simNodes.push({
          nodeId: node.id,
          nodeLabel: node.label,
          nodeType: node.type,
          state,
          highlight: highlightMode ? highlightFor(state) : 'normal',
          estimatedDurationMs: durMap.get(node.id) ?? 0,
          estimatedCost: costMap.get(node.id) ?? 0,
          inputs: {},
          outputs: {},
          decisions: [],
          errors: [],
          warnings: ['Node was not reached during simulation'],
        });
      }
    }

    const requiredConnectors = this.getRequiredConnectors(workflow);

    return {
      dryRun: true,
      workflowId: workflow.id,
      workflowName: workflow.name,
      nodes: simNodes,
      edges: simEdges,
      executionPath,
      totalEstimatedDurationMs: durEst.totalMs,
      totalEstimatedCost: costEst.totalCost,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      preflightErrors: preflight.errors,
      preflightWarnings: preflight.warnings,
      requiredConnectors,
      missingConnectors: [],
      requiredPermissions: [],
      success: preflight.errors.length === 0,
    };
  }

  getTimeline(workflow: Workflow, maxSteps: number = 100): SimulationStep[] {
    const trigger = workflow.nodes.find((n) => {
      const t = typeOf(n);
      return t === 'trigger' || t === 'webhook_trigger' || t === 'gmail_trigger';
    });
    if (!trigger) return [];

    const adj = buildAdjacency(workflow.connections);
    const visited = new Set<string>();
    const queue: string[] = [trigger.id];
    const timeline: SimulationStep[] = [];
    let stepIndex = 0;

    while (queue.length > 0 && stepIndex < maxSteps) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      timeline.push({ nodeId, stepIndex, timestamp: new Date().toISOString() });
      stepIndex++;
      for (const edge of adj.get(nodeId) ?? []) {
        if (!visited.has(edge.toNodeId)) queue.push(edge.toNodeId);
      }
    }
    return timeline;
  }

  preflightCheck(workflow: Workflow): { errors: string[]; warnings: string[]; ready: boolean } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!workflow.name || workflow.name.trim().length === 0) {
      errors.push('Workflow name is required');
    }
    if (workflow.nodes.length === 0) {
      errors.push('Workflow must have at least one node');
    }
    const triggers = workflow.nodes.filter((n) => {
      const t = typeOf(n);
      return t === 'trigger' || t === 'webhook_trigger' || t === 'gmail_trigger';
    });
    if (triggers.length === 0) errors.push('Workflow must have a trigger node');
    if (triggers.length > 1) errors.push('Workflow can only have one trigger node');

    const ends = workflow.nodes.filter((n) => n.type === 'end');
    if (ends.length === 0) warnings.push('Workflow has no end node');

    // Required-property quick check.
    for (const node of workflow.nodes) {
      for (const key of Object.keys(node.config)) {
        const v = node.config[key];
        if (v === undefined || v === null || v === '') {
          warnings.push(`Node "${node.label}" has an empty property: ${key}`);
        }
      }
    }

    return { errors, warnings, ready: errors.length === 0 };
  }

  estimateCost(workflow: Workflow): { totalCost: number; perNode: Array<{ nodeId: string; cost: number }> } {
    let totalCost = 0;
    const perNode: Array<{ nodeId: string; cost: number }> = [];
    for (const node of workflow.nodes) {
      const cost = costFor(node);
      totalCost += cost;
      perNode.push({ nodeId: node.id, cost });
    }
    return { totalCost, perNode };
  }

  estimateDuration(workflow: Workflow): { totalMs: number; perNode: Array<{ nodeId: string; durationMs: number }> } {
    let totalMs = 0;
    const perNode: Array<{ nodeId: string; durationMs: number }> = [];
    for (const node of workflow.nodes) {
      const ms = durationFor(node);
      totalMs += ms;
      perNode.push({ nodeId: node.id, durationMs: ms });
    }
    return { totalMs, perNode };
  }

  getRequiredConnectors(workflow: Workflow): string[] {
    const connectors = new Set<string>();
    for (const node of workflow.nodes) {
      const t = typeOf(node);
      const prefix = CONNECTOR_PREFIXES.find((p) => t.startsWith(p));
      if (prefix) connectors.add(prefix);
    }
    return Array.from(connectors);
  }

  // --- helpers --------------------------------------------------------------

  private idleNode(node: WorkflowNode, cost: number, duration: number): VisualSimulationNode {
    return {
      nodeId: node.id,
      nodeLabel: node.label,
      nodeType: typeOf(node),
      state: 'idle',
      highlight: 'normal',
      estimatedDurationMs: duration,
      estimatedCost: cost,
      inputs: {},
      outputs: {},
      decisions: [],
      errors: [],
      warnings: [],
    };
  }

  private confidenceFor(node: WorkflowNode): number {
    switch (typeOf(node)) {
      case 'trigger':
      case 'webhook_trigger':
      case 'gmail_trigger':
      case 'end':
      case 'human_approval':
        return 1.0;
      case 'ai_agent':
      case 'ai_prompt':
        return 0.9;
      case 'decision':
        return 0.85;
      case 'condition':
        return 0.9;
      case 'tool':
        return 0.95;
      default:
        return 0.9;
    }
  }

  private decisionsFor(node: WorkflowNode): string[] {
    if (typeOf(node) === 'decision') {
      const expr = (node.config['expression'] as string) ?? '';
      return [expr.includes('>') ? 'true' : 'false'];
    }
    return [];
  }
}
