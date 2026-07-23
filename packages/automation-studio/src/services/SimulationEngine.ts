import type { WorkflowNode, WorkflowConnection } from '../models/WorkflowModels';
import type { Workflow } from '../models/WorkflowDefinition';
import type {
  Simulation,
  SimulationRequest,
  SimulationResult,
  SimulationNodeResult,
  SimulationDecision,
  SimulationToolUsage,
  SimulationPath,
} from '../models/SimulationModels';
import type { ISimulationRepository } from '../repositories/RepositoryInterfaces';
import type {
  IRuntimeAdapter,
  ITelemetryAdapter,
  IAgentRuntimeAdapter,
  IMemoryAdapter,
} from '../integrations/IntegrationAdapters';
import { WorkflowValidationError, SimulationNotFoundError } from '../errors/AutomationStudioErrors';
import { WorkflowValidator } from '../designer/WorkflowValidator';

export class SimulationEngine {
  constructor(
    private readonly repo: ISimulationRepository,
    private readonly validator: WorkflowValidator,
    runtimeAdapter: IRuntimeAdapter,
    private readonly telemetryAdapter: ITelemetryAdapter,
    private readonly agentAdapter: IAgentRuntimeAdapter,
    memoryAdapter: IMemoryAdapter,
    private readonly idGen: () => string,
    private readonly clock: () => string,
  ) {
    void runtimeAdapter;
    void memoryAdapter;
  }

  async simulate(req: SimulationRequest): Promise<Simulation> {
    const workflows = await this.repo.findByWorkflow(req.workflowId);
    void workflows;

    const now = this.clock();
    const simId = this.idGen();

    const simulation: Simulation = {
      id: simId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: req.organizationId,
      workflowId: req.workflowId,
      workflowVersion: 0,
      status: 'running',
      triggeredBy: req.triggeredBy,
      result: null,
      startedAt: now,
      completedAt: null,
    };

    const saved = await this.repo.create(simulation);
    return saved;
  }

  async runSimulation(
    workflow: Workflow,
    req: SimulationRequest,
  ): Promise<Simulation> {
    const validation = this.validator.validate(workflow);
    if (!validation.valid) {
      throw new WorkflowValidationError('Cannot simulate invalid workflow', validation.errors);
    }

    const now = this.clock();
    const simId = this.idGen();

    const simulation: Simulation = {
      id: simId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: {},
      organizationId: req.organizationId,
      workflowId: workflow.id,
      workflowVersion: workflow.currentVersion,
      status: 'running',
      triggeredBy: req.triggeredBy,
      result: null,
      startedAt: now,
      completedAt: null,
    };

    const saved = await this.repo.create(simulation);

    try {
      const result = this.executeSimulation(workflow, req);
      const completed: Simulation = {
        ...saved,
        status: 'completed',
        result,
        completedAt: this.clock(),
        updatedAt: this.clock(),
      };
      const updated = await this.repo.update(completed);

      this.telemetryAdapter.recordEvent('simulation_completed', {
        workflowId: workflow.id,
        simulationId: simId,
        durationMs: result.totalDurationMs,
        cost: result.estimatedCost,
        confidence: result.averageConfidence,
      });

      return updated;
    } catch (e) {
      const failed: Simulation = {
        ...saved,
        status: 'failed',
        result: {
          status: 'failed',
          nodeResults: [],
          path: { nodeIds: [], edges: [] },
          decisions: [],
          toolsUsed: [],
          totalDurationMs: 0,
          estimatedCost: 0,
          averageConfidence: 0,
          error: e instanceof Error ? e.message : 'Unknown error',
        },
        completedAt: this.clock(),
        updatedAt: this.clock(),
      };
      return this.repo.update(failed);
    }
  }

  async findById(id: string): Promise<Simulation> {
    const sim = await this.repo.findById(id);
    if (!sim) throw new SimulationNotFoundError(`Simulation not found: ${id}`);
    return sim;
  }

  async findByWorkflow(workflowId: string): Promise<Simulation[]> {
    return this.repo.findByWorkflow(workflowId);
  }

  private executeSimulation(workflow: Workflow, req: SimulationRequest): SimulationResult {
    const nodeResults: SimulationNodeResult[] = [];
    const decisions: SimulationDecision[] = [];
    const toolsUsed: SimulationToolUsage[] = [];
    const pathNodeIds: string[] = [];
    const pathEdges: Array<{ from: string; to: string }> = [];
    const maxSteps = req.maxSteps ?? 100;

    const trigger = workflow.nodes.find((n) => n.type === 'trigger');
    if (!trigger) throw new WorkflowValidationError('No trigger node found');

    const adj = this.buildAdjacency(workflow.nodes, workflow.connections);
    const visited = new Set<string>();
    const queue: string[] = [trigger.id];
    let stepCount = 0;
    let totalCost = 0;
    let totalConfidence = 0;
    let confidenceCount = 0;
    let totalDuration = 0;

    while (queue.length > 0 && stepCount < maxSteps) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      stepCount++;

      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      pathNodeIds.push(nodeId);
      const startTime = Date.now();
      const nodeStart = this.clock();

      this.telemetryAdapter.recordEvent('simulation_node_started', {
        nodeId: node.id,
        nodeType: node.type,
        label: node.label,
      });

      const result = this.simulateNode(node);
      result.startedAt = nodeStart;
      result.completedAt = this.clock();
      result.durationMs = Math.max(1, Date.now() - startTime);

      nodeResults.push(result);
      totalDuration += result.durationMs;
      totalCost += result.cost;

      if (result.confidenceScore > 0) {
        totalConfidence += result.confidenceScore;
        confidenceCount++;
      }

      if (result.decisions.length > 0) {
        for (const d of result.decisions) {
          decisions.push({
            nodeId: node.id,
            nodeLabel: node.label,
            branch: d,
            reason: `Simulated branch: ${d}`,
            timestamp: this.clock(),
          });
        }
      }

      for (const tool of result.toolsUsed) {
        toolsUsed.push({
          nodeId: node.id,
          toolName: tool,
          toolVersion: '1.0.0',
          input: {},
          output: {},
          durationMs: result.durationMs,
        });
      }

      this.telemetryAdapter.recordNodeExecution(node.id, node.type, result.durationMs, result.status === 'completed');

      const neighbors = adj.get(nodeId) ?? [];
      for (const edge of neighbors) {
        if (!visited.has(edge.toNodeId)) {
          pathEdges.push({ from: nodeId, to: edge.toNodeId });
          queue.push(edge.toNodeId);
        }
      }
    }

    this.telemetryAdapter.recordCost(workflow.id, totalCost);

    const path: SimulationPath = { nodeIds: pathNodeIds, edges: pathEdges };
    const averageConfidence = confidenceCount > 0 ? totalConfidence / confidenceCount : 0;

    return {
      status: 'completed',
      nodeResults,
      path,
      decisions,
      toolsUsed,
      totalDurationMs: totalDuration,
      estimatedCost: totalCost,
      averageConfidence,
      error: null,
    };
  }

  private simulateNode(node: WorkflowNode): SimulationNodeResult {
    let cost = 0;
    let confidence = 0.9;
    const decisions: string[] = [];
    const tools: string[] = [];

    switch (node.type) {
      case 'trigger':
        cost = 0;
        confidence = 1.0;
        break;
      case 'ai_agent': {
        const agentId = (node.config['agentId'] as string) ?? 'default-agent';
        cost = this.agentAdapter.estimateCost(agentId, 100);
        confidence = this.agentAdapter.estimateConfidence(agentId, node.config);
        break;
      }
      case 'decision': {
        const expr = (node.config['expression'] as string) ?? '';
        const branch = expr.includes('>') ? 'true' : 'false';
        decisions.push(branch);
        confidence = 0.85;
        break;
      }
      case 'human_approval':
        cost = 0;
        confidence = 1.0;
        break;
      case 'tool': {
        const toolId = (node.config['toolId'] as string) ?? 'default-tool';
        tools.push(toolId);
        cost = 0.05;
        confidence = 0.95;
        break;
      }
      case 'condition':
        confidence = 0.9;
        break;
      case 'loop':
        cost = 0.01;
        confidence = 0.95;
        break;
      case 'delay':
        cost = 0;
        confidence = 1.0;
        break;
      case 'notification':
        cost = 0.001;
        confidence = 1.0;
        break;
      case 'end':
        cost = 0;
        confidence = 1.0;
        break;
    }

    return {
      nodeId: node.id,
      nodeLabel: node.label,
      nodeType: node.type,
      status: 'completed',
      startedAt: null,
      completedAt: null,
      durationMs: 0,
      output: {},
      decisions,
      toolsUsed: tools,
      cost,
      confidenceScore: confidence,
      error: null,
    };
  }

  private buildAdjacency(
    _nodes: WorkflowNode[],
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
}
