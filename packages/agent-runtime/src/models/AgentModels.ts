export type AgentStatus =
  | 'idle'
  | 'assigned'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out'
  | 'recovering';

export type AgentPriority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export type AgentHealthState = 'healthy' | 'degraded' | 'unhealthy' | 'dead';

export type TaskStatus =
  | 'pending'
  | 'dispatched'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'timed_out';

export type TaskCriticality = 'critical' | 'high' | 'normal' | 'low';

export type ExecutionStatus =
  | 'planning'
  | 'scheduled'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'recovering';

export type MessageKind =
  | 'task_request'
  | 'task_response'
  | 'error'
  | 'cancellation'
  | 'heartbeat'
  | 'event';

export type SchedulerPolicy =
  | 'priority'
  | 'round_robin'
  | 'least_loaded'
  | 'capability_based';

export interface AgentCapability {
  name: string;
  version: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

export interface AgentProfile {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  estimatedCost: number;
  priority: AgentPriority;
  compatibleTools: string[];
  requiredPermissions: string[];
  maxDurationMs: number;
  confidenceLevel: number;
  runtimeCompatible: string[];
}

export interface Agent {
  id: string;
  profile: AgentProfile;
  status: AgentStatus;
  organizationId: string;
  currentTaskId: string | null;
  createdAt: string;
  lastActiveAt: string;
  load: number;
  totalExecutions: number;
  failedExecutions: number;
}

export interface AgentTask {
  id: string;
  executionId: string;
  title: string;
  description: string;
  requiredCapabilities: string[];
  requiredPermissions: string[];
  priority: AgentPriority;
  criticality: TaskCriticality;
  input: Record<string, unknown>;
  dependencies: string[];
  assignedAgentId: string | null;
  status: TaskStatus;
  maxDurationMs: number;
  createdAt: string;
  dispatchedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  timeoutMs: number;
}

export interface AgentExecution {
  id: string;
  organizationId: string;
  status: ExecutionStatus;
  taskGraph: AgentTaskGraph;
  results: AgentResult[];
  checkpoints: AgentCheckpoint[];
  startedAt: string;
  completedAt: string | null;
  triggeredBy: string;
  correlationId: string;
  metadata: Record<string, unknown>;
}

export interface AgentTaskGraph {
  executionId: string;
  tasks: AgentTask[];
  edges: TaskEdge[];
}

export interface TaskEdge {
  fromTaskId: string;
  toTaskId: string;
  type: 'dependency' | 'data_flow' | 'parallel';
}

export interface AgentResult {
  taskId: string;
  agentId: string;
  success: boolean;
  output: Record<string, unknown>;
  error: string | null;
  durationMs: number;
  startedAt: string;
  completedAt: string;
  cost: number;
  confidenceScore: number;
}

export interface AgentCheckpoint {
  id: string;
  executionId: string;
  taskId: string;
  agentId: string;
  taskStatus: TaskStatus;
  intermediateState: Record<string, unknown>;
  timestamp: string;
  sequenceNumber: number;
}

export interface AgentMessage {
  id: string;
  executionId: string;
  kind: MessageKind;
  fromAgentId: string;
  toAgentId: string | null;
  payload: Record<string, unknown>;
  timestamp: string;
  sanitized: boolean;
}

export interface AgentHealthStatus {
  agentId: string;
  state: AgentHealthState;
  lastHeartbeat: string;
  consecutiveFailures: number;
  lastError: string | null;
  uptimeMs: number;
  memoryUsageMb: number;
  activeTasks: number;
}
