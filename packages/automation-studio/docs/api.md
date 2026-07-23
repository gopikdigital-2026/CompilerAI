# API Reference

## AutomationStudio (Facade)

```typescript
new AutomationStudio(deps: AutomationStudioDeps)
```

### Dependencies

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| idGenerator | `() => string` | Yes | UUID generator |
| clock | `() => string` | Yes | ISO timestamp generator |
| repository | `AutomationStudioRepository` | No | Defaults to in-memory |
| runtimeAdapter | `IRuntimeAdapter` | No | Defaults to null |
| telemetryAdapter | `ITelemetryAdapter` | No | Defaults to null |
| identityAdapter | `IIdentityAdapter` | No | Defaults to null |
| marketplaceAdapter | `IMarketplaceAdapter` | No | Defaults to null |
| agentRuntimeAdapter | `IAgentRuntimeAdapter` | No | Defaults to null |
| memoryAdapter | `IMemoryAdapter` | No | Defaults to null |
| toolIntelligenceAdapter | `IToolIntelligenceAdapter` | No | Defaults to null |
| monitorAdapter | `IMonitorAdapter` | No | Defaults to null |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| workflows | `WorkflowService` | CRUD for workflows |
| builder | `WorkflowBuilder` | Node and connection management |
| validator | `WorkflowValidator` | Workflow validation |
| nodeRegistry | `NodeRegistry` | Node type definitions |
| templates | `TemplateService` | Template management |
| templateLibrary | `TemplateLibrary` | Template catalog |
| simulation | `SimulationEngine` | Workflow simulation |
| publishing | `PublishingService` | Publish, clone, export, import |
| monitor | `MonitorService` | Execution monitoring |
| collaboration | `CollaborationService` | Comments, reviews, history |
| components | `ComponentLibraryService` | Component discovery and binding |
| security | `SecurityService` | Permissions and audit |

## WorkflowService

- `create(req: CreateWorkflowRequest): Promise<Workflow>`
- `findById(id: string): Promise<Workflow>`
- `findByOrganization(orgId: string): Promise<Workflow[]>`
- `findPublished(orgId: string): Promise<Workflow[]>`
- `update(id: string, updates: WorkflowUpdateFields): Promise<Workflow>`
- `delete(id: string): Promise<boolean>`
- `save(id: string, nodes, connections): Promise<Workflow>`

## WorkflowBuilder

- `addNode(req: AddNodeRequest): Promise<WorkflowNode>`
- `removeNode(workflowId, nodeId): Promise<void>`
- `updateNode(workflowId, nodeId, updates): Promise<WorkflowNode>`
- `moveNode(workflowId, nodeId, x, y): Promise<WorkflowNode>`
- `addConnection(req: AddConnectionRequest): Promise<WorkflowConnection>`
- `removeConnection(workflowId, connectionId): Promise<void>`
- `getNodes(workflowId): Promise<WorkflowNode[]>`
- `getConnections(workflowId): Promise<WorkflowConnection[]>`

## SimulationEngine

- `runSimulation(workflow, req: SimulationRequest): Promise<Simulation>`
- `findById(id: string): Promise<Simulation>`
- `findByWorkflow(workflowId: string): Promise<Simulation[]>`

## PublishingService

- `publish(req: PublishRequest): Promise<Publication>`
- `unpublish(workflowId, unpublishedBy): Promise<Publication>`
- `clone(workflowId, newName, clonedBy): Promise<Workflow>`
- `export(workflowId): Promise<ExportFormat>`
- `import(req: ImportRequest): Promise<Workflow>`
- `rollback(workflowId, targetVersion, rolledBy): Promise<Workflow>`
- `getPublications(workflowId): Promise<Publication[]>`
- `getActivePublication(workflowId): Promise<Publication | null>`

## MonitorService

- `createMonitor(orgId, executionId, workflowId, version): Promise<ExecutionMonitor>`
- `recordEvent(monitorId, event): Promise<ExecutionMonitor>`
- `addPendingApproval(monitorId, approval): Promise<ExecutionMonitor>`
- `resolveApproval(monitorId, nodeId, approved, decidedBy, comment?): Promise<ExecutionMonitor>`
- `addCheckpoint(monitorId, checkpoint): Promise<ExecutionMonitor>`
- `completeMonitor(monitorId, success): Promise<ExecutionMonitor>`

## CollaborationService

- `addComment(req: CreateCommentRequest): Promise<Comment>`
- `resolveComment(commentId): Promise<Comment>`
- `getComments(workflowId): Promise<Comment[]>`
- `requestReview(req: CreateReviewRequest): Promise<Review>`
- `completeReview(reviewId, status, comments): Promise<Review>`
- `getReviews(workflowId): Promise<Review[]>`
- `recordChange(...): Promise<ChangeHistoryEntry>`
- `getChangeHistory(workflowId): Promise<ChangeHistoryEntry[]>`

## SecurityService

- `checkPermission(ctx, action): Promise<boolean>`
- `assertPermission(ctx, action): Promise<void>`
- `assertSameOrganization(ctx, targetOrgId): Promise<void>`
- `validateBeforePublish(workflow): { valid, errors }`
- `assertCanPublish(ctx, workflow): Promise<void>`
- `auditChange(ctx, workflowId, action, description, detail?): Promise<ChangeHistoryEntry>`
