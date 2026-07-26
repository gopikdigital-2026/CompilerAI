// ---------------------------------------------------------------------------
// Core domain models for the Multi-Agent Orchestrator v2.0
// ---------------------------------------------------------------------------

// ── Agent identity & declarations ────────────────────────────────────────────

export type AgentPriority = 'critical' | 'high' | 'normal' | 'low';
export type AgentStatus = 'available' | 'busy' | 'error' | 'offline';

export interface AgentDeclaration {
  id: string;
  name: string;
  role: string;
  description: string;
  capabilities: string[];
  tools: string[];
  connectors: string[];
  estimatedCostPerTask: number;
  averageExecutionTimeMs: number;
  confidence: number;
  priority: AgentPriority;
  version: string;
}

// ── Execution plan ───────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'queued' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled' | 'skipped';

export interface TaskDependency {
  taskId: string;
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
}

export interface ApprovalRequirement {
  required: boolean;
  reason: string;
  approverRole?: string;
}

export interface PlannedTask {
  id: string;
  name: string;
  description: string;
  agentId: string;
  dependencies: TaskDependency[];
  approval: ApprovalRequirement;
  estimatedCost: number;
  estimatedDurationMs: number;
  priority: AgentPriority;
  inputRefs: string[];
  outputKey: string;
}

export interface ExecutionPlan {
  id: string;
  requestId: string;
  organizationId: string;
  request: string;
  objectives: string[];
  tasks: PlannedTask[];
  totalEstimatedCost: number;
  totalEstimatedDurationMs: number;
  estimatedSuccessProbability: number;
  language: 'en' | 'es' | 'unknown';
  createdAt: string;
}

// ── Execution ────────────────────────────────────────────────────────────────

export type ExecutionState = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface TaskResult {
  taskId: string;
  agentId: string;
  status: TaskStatus;
  output: unknown;
  confidence: number;
  reasoning: string;
  alternatives: string[];
  startedAt: string;
  completedAt: string;
  cost: number;
  durationMs: number;
  retries: number;
}

export interface TimelineEntry {
  timestamp: string;
  type: 'task_started' | 'task_completed' | 'task_failed' | 'approval_requested' | 'approval_completed' | 'checkpoint' | 'workflow_started' | 'workflow_completed' | 'workflow_cancelled' | 'recovery_attempted' | 'agent_status_changed';
  taskId?: string;
  agentId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface Checkpoint {
  id: string;
  workflowId: string;
  state: ExecutionState;
  completedTaskIds: string[];
  pendingTaskIds: string[];
  results: TaskResult[];
  timestamp: string;
}

export interface ExecutionResult {
  workflowId: string;
  state: ExecutionState;
  results: TaskResult[];
  timeline: TimelineEntry[];
  totalCost: number;
  totalDurationMs: number;
  completedAt: string;
  success: boolean;
}

// ── Agent decisions ──────────────────────────────────────────────────────────

export interface AgentDecision {
  agentId: string;
  taskId: string;
  selectedOption: string;
  confidence: number;
  reasoning: string;
  alternatives: string[];
  timestamp: string;
}

export interface DecisionHistoryEntry {
  decision: AgentDecision;
  outcome: 'success' | 'failure' | 'partial';
  timestamp: string;
}

// ── Communication bus ─────────────────────────────────────────────────────────

export type MessageType = 'request' | 'response' | 'event' | 'heartbeat' | 'status';

export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: MessageType;
  subject: string;
  payload: unknown;
  timestamp: string;
  replyTo?: string;
}

// ── Shared memory ───────────────────────────────────────────────────────────

export type MemoryEntryType = 'context' | 'document' | 'variable' | 'result' | 'reference' | 'decision';

export interface MemoryEntry {
  key: string;
  type: MemoryEntryType;
  value: unknown;
  createdBy: string;
  createdAt: string;
  isSecret: boolean;
}

// ── Approvals ────────────────────────────────────────────────────────────────

export type ApprovalState = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ApprovalRequest {
  id: string;
  workflowId: string;
  taskId: string;
  agentId: string;
  action: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  state: ApprovalState;
  requestedAt: string;
  decidedAt?: string;
  decidedBy?: string;
  reason?: string;
  expiresAt: string;
}

// ── Policies ─────────────────────────────────────────────────────────────────

export interface PolicySet {
  maxCostPerWorkflow: number;
  maxDurationMs: number;
  authorizedAgents: string[];
  authorizedConnectors: string[];
  restrictedOperations: string[];
  executionWindows: ExecutionWindow[];
  maxConcurrency: number;
  requireApprovalFor: string[];
}

export interface ExecutionWindow {
  startHour: number;
  endHour: number;
  daysOfWeek: number[];
}

// ── Simulation ──────────────────────────────────────────────────────────────

export type ConflictType = 'resource_conflict' | 'dependency_conflict' | 'policy_violation' | 'approval_blocked';

export interface SimulationConflict {
  type: ConflictType;
  taskId: string;
  description: string;
  severity: 'warning' | 'error';
}

export interface SimulationTaskResult {
  taskId: string;
  agentId: string;
  estimatedCost: number;
  estimatedDurationMs: number;
  successProbability: number;
  conflicts: SimulationConflict[];
}

export interface SimulationResult {
  workflowId: string;
  success: boolean;
  overallSuccessProbability: number;
  totalEstimatedCost: number;
  totalEstimatedDurationMs: number;
  taskResults: SimulationTaskResult[];
  conflicts: SimulationConflict[];
  workflowTrace: string[];
}

// ── Telemetry ───────────────────────────────────────────────────────────────

export type TelemetryEventType =
  | 'agent.started'
  | 'agent.completed'
  | 'agent.failed'
  | 'planner.generated'
  | 'workflow.parallelized'
  | 'workflow.completed'
  | 'approval.requested'
  | 'approval.completed'
  | 'simulation.finished';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: string;
  agentId?: string;
  workflowId?: string;
  metadata: Record<string, unknown>;
}

export interface ITelemetrySink {
  emit(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  getEventsByType(type: TelemetryEventType): TelemetryEvent[];
  clear(): void;
}

// ── Analytics ────────────────────────────────────────────────────────────────

export interface AgentMetrics {
  agentId: string;
  tasksCompleted: number;
  tasksFailed: number;
  averageConfidence: number;
  averageDurationMs: number;
  totalCost: number;
  successRate: number;
}

export interface WorkflowAnalytics {
  totalWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  averageCost: number;
  averageDurationMs: number;
  averageSuccessProbability: number;
  approvalRate: number;
}

// ── Integration interfaces (port-and-adapter pattern) ────────────────────────

export interface IAgentExecutor {
  execute(agentId: string, task: PlannedTask, memory: ISharedMemory): Promise<TaskResult>;
}

export interface ISharedMemory {
  set(entry: MemoryEntry): void;
  get(key: string): MemoryEntry | undefined;
  delete(key: string): boolean;
  list(type?: MemoryEntryType): MemoryEntry[];
  getDecisionHistory(): DecisionHistoryEntry[];
  recordDecision(entry: DecisionHistoryEntry): void;
  clear(): void;
}

export interface ICommunicationBus {
  publish(message: AgentMessage): void;
  subscribe(subscriber: string, handler: (msg: AgentMessage) => void): void;
  unsubscribe(subscriber: string): void;
  getMessages(filter?: Partial<AgentMessage>): AgentMessage[];
  clear(): void;
}

export interface IAgentRegistry {
  register(agent: AgentDeclaration): void;
  unregister(agentId: string): boolean;
  get(agentId: string): AgentDeclaration | undefined;
  list(): AgentDeclaration[];
  findBestAgent(capabilities: string[], connectors: string[]): AgentDeclaration | undefined;
}

export interface IApprovalEngine {
  request(approval: Omit<ApprovalRequest, 'id' | 'state' | 'requestedAt' | 'expiresAt'>, timeoutMs?: number): ApprovalRequest;
  approve(approvalId: string, decidedBy: string, reason?: string): ApprovalRequest;
  reject(approvalId: string, decidedBy: string, reason?: string): ApprovalRequest;
  get(approvalId: string): ApprovalRequest | undefined;
  getPending(): ApprovalRequest[];
  expireOverdue(): ApprovalRequest[];
}

export interface IPolicyEngine {
  validatePlan(plan: ExecutionPlan, policies: PolicySet): PolicyValidationResult;
  validateAgent(agent: AgentDeclaration, policies: PolicySet): PolicyValidationResult;
  validateOperation(operation: string, policies: PolicySet): PolicyValidationResult;
}

export interface PolicyValidationResult {
  valid: boolean;
  violations: PolicyViolation[];
}

export interface PolicyViolation {
  rule: string;
  description: string;
  severity: 'warning' | 'error';
}

export interface ITelemetryEngine {
  emit(event: TelemetryEvent): void;
  getEvents(): TelemetryEvent[];
  getEventsByType(type: TelemetryEventType): TelemetryEvent[];
  getEventsByAgent(agentId: string): TelemetryEvent[];
  clear(): void;
}

export interface ISimulationEngine {
  simulate(plan: ExecutionPlan, registry: IAgentRegistry, policies: PolicySet): SimulationResult;
}

export interface IPlanner {
  generate(request: string, organizationId: string, registry: IAgentRegistry): ExecutionPlan;
}

export interface IExecutionEngine {
  execute(plan: ExecutionPlan, executor: IAgentExecutor, memory: ISharedMemory, bus: ICommunicationBus, telemetry: ITelemetryEngine, policies: PolicySet, approvals: IApprovalEngine): Promise<ExecutionResult>;
  cancel(workflowId: string): boolean;
  getStatus(workflowId: string): ExecutionState | undefined;
  getTimeline(workflowId: string): TimelineEntry[];
  getCheckpoint(workflowId: string): Checkpoint | undefined;
  resume(workflowId: string, executor: IAgentExecutor, memory: ISharedMemory, bus: ICommunicationBus, telemetry: ITelemetryEngine, policies: PolicySet, approvals: IApprovalEngine): Promise<ExecutionResult>;
}

export interface IAnalyticsEngine {
  recordResult(result: ExecutionResult): void;
  getAgentMetrics(agentId: string): AgentMetrics;
  getAllAgentMetrics(): AgentMetrics[];
  getWorkflowAnalytics(): WorkflowAnalytics;
  clear(): void;
}
