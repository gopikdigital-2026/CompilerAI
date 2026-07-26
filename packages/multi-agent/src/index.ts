// Core entry point — Multi-Agent Orchestrator v2.0
export { MultiAgentOrchestrator } from './orchestrator/MultiAgentOrchestrator.js';
export type { OrchestratorConfig } from './orchestrator/MultiAgentOrchestrator.js';
export { createDefaultPolicies } from './orchestrator/MultiAgentOrchestrator.js';

// Orchestrator
export type {
  IAgentRegistry,
  IAgentExecutor,
  ISharedMemory,
  ICommunicationBus,
  IApprovalEngine,
  IPolicyEngine,
  ITelemetryEngine,
  ISimulationEngine,
  IPlanner,
  IExecutionEngine,
  IAnalyticsEngine,
} from './models.js';

// All domain models & types
export type {
  AgentDeclaration,
  AgentPriority,
  AgentStatus,
  AgentMessage,
  MessageType,
  AgentDecision,
  DecisionHistoryEntry,
  ExecutionPlan,
  ExecutionState,
  ExecutionResult,
  PlannedTask,
  TaskDependency,
  TaskResult,
  TaskStatus,
  TimelineEntry,
  Checkpoint,
  ApprovalRequest,
  ApprovalState,
  ApprovalRequirement,
  MemoryEntry,
  MemoryEntryType,
  PolicySet,
  PolicyViolation,
  PolicyValidationResult,
  ExecutionWindow,
  SimulationResult,
  SimulationTaskResult,
  SimulationConflict,
  ConflictType,
  TelemetryEvent,
  TelemetryEventType,
  ITelemetrySink,
  AgentMetrics,
  WorkflowAnalytics,
} from './models.js';

// Concrete implementations
export { AgentRegistry } from './registry/AgentRegistry.js';
export { createAllAgents, createDefaultRegistry } from './agents/AgentDefinitions.js';
export { IntelligentPlanner } from './planner/IntelligentPlanner.js';
export { ExecutionEngine } from './execution/ExecutionEngine.js';
export { TaskScheduler } from './scheduling/TaskScheduler.js';
export type { ScheduledSlot } from './scheduling/TaskScheduler.js';
export { CommunicationBus } from './communication/CommunicationBus.js';
export { SharedMemory } from './memory/SharedMemory.js';
export { ApprovalEngine } from './approvals/ApprovalEngine.js';
export { PolicyEngine } from './policies/PolicyEngine.js';
export { TelemetryEngine } from './telemetry/TelemetryEngine.js';
export { DigitalTwinSimulator } from './simulation/DigitalTwinSimulator.js';
export { AnalyticsEngine } from './analytics/AnalyticsEngine.js';

// Mock executor for testing and dry-run scenarios
export { MockAgentExecutor } from './agents/MockAgentExecutor.js';
