import { CanvasViewport } from '../canvas/CanvasViewport.js';
import { CanvasSelection } from '../canvas/CanvasSelection.js';
import { MiniMap } from '../canvas/MiniMap.js';
import { AutoLayout } from '../canvas/AutoLayout.js';
import { CanvasPerformance } from '../canvas/CanvasPerformance.js';
import { ConnectorNodeLibrary } from '../node-library/ConnectorNodeLibrary.js';
import type { IConnectorNodeSource } from '../node-library/ConnectorNodeLibrary.js';
import { PropertyInspector } from '../inspector/PropertyInspector.js';
import { ValidationFeedback } from '../inspector/ValidationFeedback.js';
import { VersionManager } from '../versioning/VersionManager.js';
import { DeploymentManager } from '../deployment/DeploymentManager.js';
import { VisualSimulation } from '../simulation/VisualSimulation.js';
import type { IStudioTelemetry, StudioEvent } from '../telemetry/StudioTelemetry.js';
import { InMemoryStudioTelemetry } from '../telemetry/StudioTelemetry.js';
import { NodeRegistry } from '../designer/NodeRegistry.js';
import { WorkflowValidator } from '../designer/WorkflowValidator.js';
import type { Workflow } from '../models/WorkflowDefinition.js';
import type { WorkflowNode, WorkflowConnection } from '../models/WorkflowModels.js';
import type { IRuntimeAdapter } from '../integrations/IntegrationAdapters.js';
import { NullRuntimeAdapter } from '../integrations/IntegrationAdapters.js';

export interface StudioApiDeps {
  idGenerator: () => string;
  clock: () => string;
  connectorSource?: IConnectorNodeSource | null;
  runtimeAdapter?: IRuntimeAdapter | null;
  telemetry?: IStudioTelemetry | null;
}

export interface CopilotWorkflowImport {
  id: string;
  name: string;
  description: string;
  steps: Array<{
    id: string;
    type: string;
    name: string;
    connectorId: string | null;
    capability: string | null;
    parameters: Record<string, unknown>;
    dependsOn: string[];
  }>;
  dag: {
    nodes: Array<{
      id: string;
      type: string;
      label: string;
      connectorId: string | null;
      capabilityName: string | null;
    }>;
    edges: Array<{ from: string; to: string }>;
  };
}

export interface CopilotWorkflowExport {
  name: string;
  description: string;
  nodes: Array<{ id: string; type: string; label: string; connectorId: string | null }>;
  edges: Array<{ from: string; to: string }>;
}

const TYPE_MAP: Record<string, string> = {
  trigger: 'trigger',
  action: 'tool',
  condition: 'condition',
  decision: 'decision',
  ai_agent: 'ai_agent',
  ai_prompt: 'ai_prompt',
  notification: 'notification',
  delay: 'delay',
  wait: 'wait',
  loop: 'loop',
  end: 'end',
  human_approval: 'human_approval',
  gmail_trigger: 'gmail_trigger',
  gmail_send: 'gmail_send',
  drive_upload: 'drive_upload',
  drive_list: 'drive_list',
  calendar_create: 'calendar_create',
  calendar_list: 'calendar_list',
  github_create_issue: 'github_create_issue',
  github_list_issues: 'github_list_issues',
  http_request: 'http_request',
  webhook_trigger: 'webhook_trigger',
  variable_set: 'variable_set',
  variable_get: 'variable_get',
  retry: 'retry',
};

function mapCopilotType(type: string): string {
  return TYPE_MAP[type] ?? 'tool';
}

export class StudioApi {
  readonly viewport: CanvasViewport;
  readonly selection: CanvasSelection;
  readonly miniMap: MiniMap;
  readonly autoLayout: AutoLayout;
  readonly performance: typeof CanvasPerformance;
  readonly nodeLibrary: ConnectorNodeLibrary;
  readonly inspector: PropertyInspector;
  readonly validationFeedback: typeof ValidationFeedback;
  readonly versionManager: VersionManager;
  readonly deployment: DeploymentManager;
  readonly visualSimulation: VisualSimulation;
  readonly telemetry: IStudioTelemetry;
  private readonly nodeRegistry: NodeRegistry;
  private readonly validator: WorkflowValidator;
  private readonly idGen: () => string;
  private readonly clock: () => string;

  constructor(deps: StudioApiDeps) {
    this.idGen = deps.idGenerator;
    this.clock = deps.clock;

    this.nodeRegistry = new NodeRegistry();
    this.validator = new WorkflowValidator(this.nodeRegistry);
    this.nodeLibrary = new ConnectorNodeLibrary(deps.connectorSource ?? null);
    this.inspector = new PropertyInspector(this.nodeRegistry, this.nodeLibrary);
    this.viewport = new CanvasViewport();
    this.selection = new CanvasSelection();
    this.miniMap = new MiniMap();
    this.autoLayout = new AutoLayout();
    this.performance = CanvasPerformance;
    this.validationFeedback = ValidationFeedback;
    this.versionManager = new VersionManager(this.idGen, this.clock);
    this.visualSimulation = new VisualSimulation();

    const runtime = deps.runtimeAdapter ?? new NullRuntimeAdapter();
    this.deployment = new DeploymentManager(this.validator, runtime, this.idGen, this.clock);

    this.telemetry = deps.telemetry ?? new InMemoryStudioTelemetry();
  }

  async importFromCopilot(
    copilotWorkflow: CopilotWorkflowImport,
    organizationId: string,
    userId: string,
  ): Promise<Workflow> {
    const now = this.clock();
    const workflowId = this.idGen();

    const dagNodes = copilotWorkflow.dag.nodes;
    const dagEdges = copilotWorkflow.dag.edges;

    // Map DAG node types to studio node types.
    const layoutInput = dagNodes.map((n) => ({ id: n.id, type: mapCopilotType(n.type) }));
    const layoutEdges = dagEdges.map((e) => ({ from: e.from, to: e.to }));
    const layout = this.autoLayout.layout(layoutInput, layoutEdges);
    const posMap = new Map(layout.nodes.map((n) => [n.id, n]));

    // Build nodes from steps (steps carry parameters/config).
    const stepMap = new Map(copilotWorkflow.steps.map((s) => [s.id, s]));
    const nodes: WorkflowNode[] = dagNodes.map((dagNode) => {
      const step = stepMap.get(dagNode.id);
      const studioType = mapCopilotType(dagNode.type);
      const pos = posMap.get(dagNode.id);
      return {
        id: dagNode.id,
        version: 1,
        createdAt: now,
        updatedAt: now,
        metadata: {},
        organizationId,
        type: studioType as WorkflowNode['type'],
        label: dagNode.label,
        workflowId,
        positionX: pos?.positionX ?? 0,
        positionY: pos?.positionY ?? 0,
        config: step?.parameters ?? {},
        status: 'idle' as const,
        validationErrors: [],
      };
    });

    // Build connections from dependsOn and DAG edges.
    const connections: WorkflowConnection[] = [];
    let connIdx = 0;
    const edgeSet = new Set<string>();
    for (const step of copilotWorkflow.steps) {
      for (const dep of step.dependsOn) {
        const key = `${dep}->${step.id}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        connections.push({
          id: `${workflowId}_conn_${connIdx++}`,
          workflowId,
          fromNodeId: dep,
          toNodeId: step.id,
          fromPort: 'out',
          toPort: 'in',
          label: null,
        });
      }
    }
    // Also incorporate any DAG edges not covered by dependsOn.
    for (const edge of dagEdges) {
      const key = `${edge.from}->${edge.to}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      connections.push({
        id: `${workflowId}_conn_${connIdx++}`,
        workflowId,
        fromNodeId: edge.from,
        toNodeId: edge.to,
        fromPort: 'out',
        toPort: 'in',
        label: null,
      });
    }

    const workflow: Workflow = {
      id: workflowId,
      version: 1,
      createdAt: now,
      updatedAt: now,
      metadata: { source: 'copilot', copilotWorkflowId: copilotWorkflow.id },
      organizationId,
      name: copilotWorkflow.name,
      description: copilotWorkflow.description,
      category: 'custom',
      status: 'draft',
      currentVersion: 1,
      nodes,
      connections,
      versions: [],
      tags: ['copilot'],
      createdBy: userId,
      lastModifiedBy: userId,
      publishedAt: null,
      publishedBy: null,
    };

    this.emitEvent('copilot.workflow_imported', organizationId, workflowId, userId, {
      stepCount: copilotWorkflow.steps.length,
      nodeCount: nodes.length,
    });

    return workflow;
  }

  exportToCopilot(workflow: Workflow): CopilotWorkflowExport {
    const connectorOf = (type: string): string | null => {
      const def = this.nodeLibrary.getDefinition(type);
      if (!def) return null;
      const connectorDef = this.nodeLibrary.getConnectorNodes(type);
      void connectorDef;
      return null;
    };

    return {
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        connectorId: connectorOf(n.type),
      })),
      edges: workflow.connections.map((c) => ({ from: c.fromNodeId, to: c.toNodeId })),
    };
  }

  private emitEvent(
    type: StudioEvent['type'],
    organizationId: string | null,
    workflowId: string | null,
    userId: string | null,
    metadata: Record<string, unknown>,
  ): void {
    this.telemetry.emit({
      type,
      timestamp: this.clock(),
      organizationId,
      workflowId,
      userId,
      metadata,
    });
  }
}
