import type {
  Agent,
  AgentProfile,
  AgentTask,
  AgentExecution,
  AgentTaskGraph,
  AgentCheckpoint,
  AgentMessage,
  AgentHealthStatus,
  SchedulerPolicy,
  TaskEdge,
} from '../models/AgentModels';
import type { IAgentRegistry } from './AgentRegistry';
import type { ICapabilityRegistry } from './CapabilityRegistry';
import type { IScheduler } from './AgentScheduler';
import type { IAgentCommunicationBus } from './AgentCommunicationBus';
import type { IAgentHealthMonitor } from './AgentHealthMonitor';
import type { IAgentLifecycleManager } from './AgentLifecycleManager';
import type { IAgentCheckpointManager } from './AgentCheckpointManager';
import type { IAgentRecoveryManager } from './AgentRecoveryManager';
import type { IAgentPolicyEngine } from './AgentPolicyEngine';
import type { IAgentCoordinator } from './AgentCoordinator';
import type { IAgentTaskDispatcher, TaskExecutorFn } from './AgentTaskDispatcher';
import type {
  ITelemetryAdapter,
  IMemoryAdapter,
  IMarketplaceAdapter,
  IExecutionAdapter,
} from '../integrations/IntegrationAdapters';

import { AgentRegistry as AgentRegistryImpl } from './AgentRegistry';
import { CapabilityRegistry as CapabilityRegistryImpl } from './CapabilityRegistry';
import { AgentScheduler as AgentSchedulerImpl } from './AgentScheduler';
import { AgentCommunicationBus as CommBusImpl } from './AgentCommunicationBus';
import { AgentHealthMonitor as HealthMonitorImpl } from './AgentHealthMonitor';
import { AgentLifecycleManager as LifecycleManagerImpl } from './AgentLifecycleManager';
import { AgentCheckpointManager as CheckpointManagerImpl } from './AgentCheckpointManager';
import { AgentRecoveryManager as RecoveryManagerImpl } from './AgentRecoveryManager';
import { AgentPolicyEngine as PolicyEngineImpl } from './AgentPolicyEngine';
import { AgentTaskDispatcher as DispatcherImpl } from './AgentTaskDispatcher';
import { AgentCoordinator as CoordinatorImpl } from './AgentCoordinator';

import {
  NullTelemetryAdapter,
  NullMemoryAdapter,
  NullMarketplaceAdapter,
  NullExecutionAdapter,
} from '../integrations/IntegrationAdapters';

export interface AgentRuntimeDeps {
  idGenerator: () => string;
  clock: () => string;
  telemetry?: ITelemetryAdapter;
  memory?: IMemoryAdapter;
  marketplace?: IMarketplaceAdapter;
  execution?: IExecutionAdapter;
  blockedPermissions?: string[];
  schedulerPolicy?: SchedulerPolicy;
}

export interface CreateExecutionRequest {
  organizationId: string;
  tasks: Omit<AgentTask, 'id' | 'executionId' | 'status' | 'assignedAgentId' | 'createdAt' | 'dispatchedAt' | 'startedAt' | 'completedAt'>[];
  edges: Omit<TaskEdge, never>[];
  triggeredBy: string;
  metadata?: Record<string, unknown>;
}

export class AgentRuntime {
  readonly id = 'agent-runtime-v1';

  readonly registry: IAgentRegistry;
  readonly capabilityRegistry: ICapabilityRegistry;
  readonly scheduler: IScheduler;
  readonly commBus: IAgentCommunicationBus;
  readonly healthMonitor: IAgentHealthMonitor;
  readonly lifecycleManager: IAgentLifecycleManager;
  readonly checkpointManager: IAgentCheckpointManager;
  readonly recoveryManager: IAgentRecoveryManager;
  readonly policyEngine: IAgentPolicyEngine;
  readonly dispatcher: IAgentTaskDispatcher;
  readonly coordinator: IAgentCoordinator;

  readonly telemetry: ITelemetryAdapter;
  readonly memory: IMemoryAdapter;
  readonly marketplace: IMarketplaceAdapter;
  readonly executionAdapter: IExecutionAdapter;

  constructor(deps: AgentRuntimeDeps) {
    this.telemetry = deps.telemetry ?? new NullTelemetryAdapter();
    this.memory = deps.memory ?? new NullMemoryAdapter();
    this.marketplace = deps.marketplace ?? new NullMarketplaceAdapter();
    this.executionAdapter = deps.execution ?? new NullExecutionAdapter();

    this.registry = new AgentRegistryImpl(deps.idGenerator, deps.clock);
    this.capabilityRegistry = new CapabilityRegistryImpl();
    this.scheduler = new AgentSchedulerImpl(deps.schedulerPolicy ?? 'capability_based');
    this.commBus = new CommBusImpl(deps.idGenerator, deps.clock);
    this.healthMonitor = new HealthMonitorImpl(deps.clock);
    this.lifecycleManager = new LifecycleManagerImpl(deps.clock);
    this.checkpointManager = new CheckpointManagerImpl(deps.idGenerator, deps.clock);
    this.policyEngine = new PolicyEngineImpl(deps.blockedPermissions ?? []);
    this.recoveryManager = new RecoveryManagerImpl(
      this.registry,
      this.checkpointManager,
      this.healthMonitor,
      this.lifecycleManager,
      deps.clock,
    );
    this.dispatcher = new DispatcherImpl(
      this.registry,
      this.scheduler,
      this.healthMonitor,
      this.lifecycleManager,
      this.commBus,
      this.policyEngine,
      this.telemetry,
      this.memory,
      this.executionAdapter,
      deps.clock,
    );
    this.coordinator = new CoordinatorImpl(
      this.dispatcher,
      this.checkpointManager,
      this.recoveryManager,
      this.commBus,
      this.healthMonitor,
      this.registry,
      this.telemetry,
      this.memory,
      this.executionAdapter,
      deps.clock,
    );
  }

  registerAgent(profile: AgentProfile, organizationId: string): Agent {
    const validation = this.policyEngine.validateProfile(profile);
    if (!validation.allowed) {
      throw new Error(`Invalid agent profile: ${validation.errors.join('; ')}`);
    }
    const agent = this.registry.register(profile, organizationId);
    this.healthMonitor.recordHeartbeat(agent.id);
    this.telemetry.recordEvent('agent_registered', { agentId: agent.id, organizationId });
    return agent;
  }

  createExecution(request: CreateExecutionRequest): AgentExecution {
    const executionId = (this as unknown as { idGenerator: () => string }).idGenerator?.() ?? `exec_${Date.now()}`;
    const now = (this as unknown as { clock: () => string }).clock?.() ?? new Date().toISOString();

    const tasks: AgentTask[] = request.tasks.map((t) => ({
      ...t,
      id: `task_${executionId}_${Math.random().toString(36).slice(2, 8)}`,
      executionId,
      status: 'pending',
      assignedAgentId: null,
      createdAt: now,
      dispatchedAt: null,
      startedAt: null,
      completedAt: null,
    }));

    const taskGraph: AgentTaskGraph = {
      executionId,
      tasks,
      edges: request.edges,
    };

    const execution: AgentExecution = {
      id: executionId,
      organizationId: request.organizationId,
      status: 'planning',
      taskGraph,
      results: [],
      checkpoints: [],
      startedAt: now,
      completedAt: null,
      triggeredBy: request.triggeredBy,
      correlationId: executionId,
      metadata: request.metadata ?? {},
    };

    this.memory.write(executionId, 'execution_state', execution);
    return execution;
  }

  async run(
    execution: AgentExecution,
    executor: TaskExecutorFn,
  ): Promise<AgentExecution> {
    return this.coordinator.execute(execution, execution.organizationId, executor);
  }

  cancel(executionId: string): boolean {
    return this.coordinator.cancel(executionId);
  }

  async resume(executionId: string, organizationId: string, executor: TaskExecutorFn): Promise<AgentExecution> {
    return this.coordinator.resumeFromCheckpoint(executionId, organizationId, executor);
  }

  listAgents(organizationId?: string): Agent[] {
    if (organizationId) return this.registry.getByOrganization(organizationId);
    return this.registry.list();
  }

  getAgentHealth(agentId: string): AgentHealthStatus | null {
    return this.healthMonitor.getHealth(agentId);
  }

  getMessages(executionId?: string): AgentMessage[] {
    return this.commBus.getMessages(executionId);
  }

  getCheckpoints(executionId: string): AgentCheckpoint[] {
    return this.checkpointManager.getAll(executionId);
  }

  getAuditTrail(executionId: string): AgentMessage[] {
    return this.commBus.getMessages(executionId);
  }

  setSchedulerPolicy(policy: SchedulerPolicy): void {
    this.scheduler.setPolicy(policy);
  }

  clear(): void {
    this.registry.clear();
    this.capabilityRegistry.clear();
    this.commBus.clear();
    this.healthMonitor.clear();
    this.checkpointManager.clear();
    this.recoveryManager.resetAttempts();
  }
}
