export { AutomationStudio } from './AutomationStudio';
export type { AutomationStudioDeps } from './AutomationStudio';

export { NodeRegistry } from './designer/NodeRegistry';
export { WorkflowValidator } from './designer/WorkflowValidator';
export type { ValidationResult } from './designer/WorkflowValidator';
export { WorkflowBuilder } from './designer/WorkflowBuilder';
export type { AddNodeRequest, AddConnectionRequest } from './designer/WorkflowBuilder';

export { WorkflowService } from './services/WorkflowService';
export { TemplateLibrary } from './services/TemplateLibrary';
export { TemplateService } from './services/TemplateService';
export { SimulationEngine } from './services/SimulationEngine';
export { PublishingService } from './services/PublishingService';
export { MonitorService } from './services/MonitorService';
export { CollaborationService } from './services/CollaborationService';
export { ComponentLibraryService } from './services/ComponentLibraryService';
export { SecurityService } from './services/SecurityService';
export type { SecurityContext } from './services/SecurityService';

export type {
  IRuntimeAdapter,
  ITelemetryAdapter,
  IIdentityAdapter,
  IMarketplaceAdapter,
  IAgentRuntimeAdapter,
  IMemoryAdapter,
  IToolIntelligenceAdapter,
  IMonitorAdapter,
} from './integrations/IntegrationAdapters';
export {
  NullRuntimeAdapter,
  NullTelemetryAdapter,
  NullIdentityAdapter,
  NullMarketplaceAdapter,
  NullAgentRuntimeAdapter,
  NullMemoryAdapter,
  NullToolIntelligenceAdapter,
  NullMonitorAdapter,
} from './integrations/IntegrationAdapters';

export {
  AutomationStudioError,
  WorkflowNotFoundError,
  NodeNotFoundError,
  ConnectionNotFoundError,
  WorkflowValidationError,
  NodeValidationError,
  PublicationNotFoundError,
  WorkflowAlreadyPublishedError,
  WorkflowNotPublishedError,
  SimulationNotFoundError,
  SimulationError,
  TemplateNotFoundError,
  ImportExportError,
  MonitorNotFoundError,
  ReviewNotFoundError,
  CommentNotFoundError,
  ComponentNotFoundError,
  RollbackError,
  CrossTenantError,
  AuthorizationError,
} from './errors/AutomationStudioErrors';

export type {
  UUID,
  ISOString,
  Metadata,
  BaseEntity,
  OrganizationScopedEntity,
  PaginatedResult,
  PageQuery,
  Result,
} from './types/shared';
export { ok, err } from './types/shared';

export type {
  NodeType,
  NodeCategory,
  NodeStatus,
  NodePort,
  NodePropertyDescriptor,
  NodeDefinition,
  WorkflowNode,
  WorkflowConnection,
} from './models/WorkflowModels';

export type {
  Workflow,
  WorkflowStatus,
  WorkflowCategory,
  WorkflowVersion,
  WorkflowSnapshot,
  CreateWorkflowRequest,
  WorkflowUpdateFields,
} from './models/WorkflowDefinition';
export { WORKFLOW_CATEGORIES } from './models/WorkflowDefinition';

export type {
  WorkflowTemplate,
  TemplateNodeSpec,
  TemplateConnectionSpec,
} from './models/TemplateModels';

export type {
  Simulation,
  SimulationRequest,
  SimulationResult,
  SimulationNodeResult,
  SimulationDecision,
  SimulationToolUsage,
  SimulationPath,
  SimulationStatus,
  SimulatedNodeStatus,
} from './models/SimulationModels';

export type {
  Publication,
  PublishRequest,
  PublicationStatus,
  ExportFormat,
  ExportedWorkflow,
  ExportedNode,
  ExportedConnection,
  ImportRequest,
} from './models/PublicationModels';

export type {
  ExecutionMonitor,
  MonitorEvent,
  MonitorEventLevel,
  MonitorEventType,
  PendingApproval,
  CheckpointInfo,
} from './models/MonitorModels';

export type {
  Comment,
  Review,
  ReviewStatus,
  ChangeHistoryEntry,
  ChangeAction,
  CreateCommentRequest,
  CreateReviewRequest,
} from './models/CollaborationModels';

export type {
  ComponentDescriptor,
  ComponentLibraryCategory,
  ComponentBinding,
  ComponentLibrary,
  ComponentSource,
} from './models/ComponentModels';

export type {
  AutomationStudioRepository,
  IWorkflowRepository,
  ISimulationRepository,
  IPublicationRepository,
  IMonitorRepository,
  ICommentRepository,
  IReviewRepository,
  IChangeHistoryRepository,
} from './repositories/RepositoryInterfaces';
export { InMemoryAutomationStudioRepository } from './repositories/InMemoryRepository';
