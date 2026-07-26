import type {
  AgentDeclaration,
  AgentMetrics,
  ApprovalRequest,
  Checkpoint,
  ExecutionPlan,
  ExecutionResult,
  ExecutionState,
  IAgentExecutor,
  IAnalyticsEngine,
  IApprovalEngine,
  ICommunicationBus,
  IExecutionEngine,
  IPlanner,
  IPolicyEngine,
  ISharedMemory,
  ISimulationEngine,
  IAgentRegistry,
  ITelemetryEngine,
  PolicySet,
  SimulationResult,
  TimelineEntry,
  WorkflowAnalytics,
} from '../models.js';
import { AgentRegistry } from '../registry/AgentRegistry.js';
import { createAllAgents } from '../agents/AgentDefinitions.js';
import { IntelligentPlanner } from '../planner/IntelligentPlanner.js';
import { ExecutionEngine } from '../execution/ExecutionEngine.js';
import { CommunicationBus } from '../communication/CommunicationBus.js';
import { SharedMemory } from '../memory/SharedMemory.js';
import { ApprovalEngine } from '../approvals/ApprovalEngine.js';
import { PolicyEngine } from '../policies/PolicyEngine.js';
import { TelemetryEngine } from '../telemetry/TelemetryEngine.js';
import { DigitalTwinSimulator } from '../simulation/DigitalTwinSimulator.js';
import { AnalyticsEngine } from '../analytics/AnalyticsEngine.js';

export interface OrchestratorConfig {
  organizationId: string;
  policies: PolicySet;
  executor: IAgentExecutor;
}

export function createDefaultPolicies(): PolicySet {
  return {
    maxCostPerWorkflow: 100,
    maxDurationMs: 60_000,
    authorizedAgents: createAllAgents().map((a) => a.id),
    authorizedConnectors: ['salesforce', 'hubspot', 'google', 'github', 'slack', 'jira', 'notion'],
    restrictedOperations: ['delete_production_data', 'force_deploy', 'drop_database'],
    executionWindows: [],
    maxConcurrency: 3,
    requireApprovalFor: ['payment', 'deployment', 'contract', 'campaign_launch', 'data_deletion', 'critical_change'],
  };
}

export class MultiAgentOrchestrator {
  public readonly registry: IAgentRegistry;
  public readonly planner: IPlanner;
  public readonly execution: IExecutionEngine;
  public readonly communication: ICommunicationBus;
  public readonly memory: ISharedMemory;
  public readonly approvals: IApprovalEngine;
  public readonly policies: IPolicyEngine;
  public readonly telemetry: ITelemetryEngine;
  public readonly simulator: ISimulationEngine;
  public readonly analytics: IAnalyticsEngine;

  private readonly organizationId: string;
  private readonly policySet: PolicySet;
  private readonly executor: IAgentExecutor;

  constructor(config: OrchestratorConfig) {
    this.organizationId = config.organizationId;
    this.policySet = config.policies;
    this.executor = config.executor;

    this.registry = new AgentRegistry();
    for (const agent of createAllAgents()) {
      this.registry.register(agent);
    }

    this.planner = new IntelligentPlanner();
    this.execution = new ExecutionEngine();
    this.communication = new CommunicationBus();
    this.memory = new SharedMemory();
    this.approvals = new ApprovalEngine();
    this.policies = new PolicyEngine();
    this.telemetry = new TelemetryEngine();
    this.simulator = new DigitalTwinSimulator();
    this.analytics = new AnalyticsEngine();
  }

  // ── Public API (10 methods per spec) ────────────────────────────────────────

  registerAgent(agent: AgentDeclaration): void {
    this.registry.register(agent);
    this.policySet.authorizedAgents.push(agent.id);
  }

  unregisterAgent(agentId: string): boolean {
    const removed = this.registry.unregister(agentId);
    if (removed) {
      this.policySet.authorizedAgents = this.policySet.authorizedAgents.filter((id) => id !== agentId);
    }
    return removed;
  }

  async executeWorkflow(request: string): Promise<ExecutionResult> {
    const plan = this.planner.generate(request, this.organizationId, this.registry);
    const result = await this.execution.execute(
      plan,
      this.executor,
      this.memory,
      this.communication,
      this.telemetry,
      this.policySet,
      this.approvals,
    );
    this.analytics.recordResult(result);
    return result;
  }

  simulateWorkflow(request: string): SimulationResult {
    const plan = this.planner.generate(request, this.organizationId, this.registry);
    const result = this.simulator.simulate(plan, this.registry, this.policySet);
    this.telemetry.emit({
      type: 'simulation.finished',
      timestamp: new Date().toISOString(),
      workflowId: plan.id,
      metadata: {
        success: result.success,
        conflictCount: result.conflicts.length,
        estimatedCost: result.totalEstimatedCost,
        estimatedDurationMs: result.totalEstimatedDurationMs,
      },
    });
    return result;
  }

  requestApproval(
    workflowId: string,
    taskId: string,
    agentId: string,
    action: string,
    description: string,
    riskLevel: ApprovalRequest['riskLevel'],
  ): ApprovalRequest {
    return this.approvals.request({ workflowId, taskId, agentId, action, description, riskLevel });
  }

  async resumeWorkflow(workflowId: string): Promise<ExecutionResult> {
    return this.execution.resume(
      workflowId,
      this.executor,
      this.memory,
      this.communication,
      this.telemetry,
      this.policySet,
      this.approvals,
    );
  }

  cancelWorkflow(workflowId: string): boolean {
    return this.execution.cancel(workflowId);
  }

  getExecutionStatus(workflowId: string): ExecutionState | undefined {
    return this.execution.getStatus(workflowId);
  }

  getWorkflowTimeline(workflowId: string): TimelineEntry[] {
    return this.execution.getTimeline(workflowId);
  }

  getAgentMetrics(agentId: string): AgentMetrics {
    return this.analytics.getAgentMetrics(agentId);
  }

  // ── Convenience helpers ─────────────────────────────────────────────────────

  getWorkflowAnalytics(): WorkflowAnalytics {
    return this.analytics.getWorkflowAnalytics();
  }

  getCheckpoint(workflowId: string): Checkpoint | undefined {
    return this.execution.getCheckpoint(workflowId);
  }

  listAgents(): AgentDeclaration[] {
    return this.registry.list();
  }

  generatePlan(request: string): ExecutionPlan {
    return this.planner.generate(request, this.organizationId, this.registry);
  }
}
