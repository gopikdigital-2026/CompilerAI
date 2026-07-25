import type { WorkflowNode, WorkflowConnection, NodeType } from '../src/models/WorkflowModels.js';
import type { Workflow, WorkflowVersion, WorkflowSnapshot } from '../src/models/WorkflowDefinition.js';
import type { CopilotWorkflowImport } from '../src/api/StudioApi.js';
import type { ExportFormat } from '../src/models/PublicationModels.js';

const NOW = '2026-01-01T00:00:00.000Z';

let idCounter = 0;
function freshId(prefix: string): string {
  return `${prefix}_${++idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

export function makeIdGenerator(): () => string {
  let n = 0;
  return () => `gen_id_${++n}`;
}

export function fixedClock(): () => string {
  return () => NOW;
}

/** Create a single WorkflowNode with sensible defaults. */
export function makeNode(
  overrides: Partial<WorkflowNode> & { id: string; type: NodeType; label: string },
): WorkflowNode {
  return {
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    metadata: {},
    organizationId: 'test-org',
    workflowId: 'wf-1',
    positionX: 0,
    positionY: 0,
    config: {},
    status: 'idle' as const,
    validationErrors: [],
    ...overrides,
  };
}

/** Create a single WorkflowConnection with sensible defaults. */
export function makeConnection(
  overrides: Partial<WorkflowConnection> & { id: string; fromNodeId: string; toNodeId: string },
): WorkflowConnection {
  return {
    workflowId: 'wf-1',
    fromPort: 'out',
    toPort: 'in',
    label: null,
    ...overrides,
  };
}

/**
 * Create a minimal valid workflow: trigger → end, 2 nodes, 1 connection.
 */
export function createMinimalWorkflow(): Workflow {
  const trigger = makeNode({
    id: 'n_trigger',
    type: 'trigger',
    label: 'Start',
    positionX: 100,
    positionY: 100,
    config: { eventType: 'manual' },
  });
  const end = makeNode({
    id: 'n_end',
    type: 'end',
    label: 'End',
    positionX: 400,
    positionY: 100,
    config: {},
  });
  const conn = makeConnection({
    id: 'c_1',
    fromNodeId: 'n_trigger',
    toNodeId: 'n_end',
  });
  return {
    id: 'wf-min',
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    metadata: {},
    organizationId: 'test-org',
    name: 'Minimal Workflow',
    description: 'A minimal trigger→end workflow',
    category: 'custom',
    status: 'draft',
    currentVersion: 1,
    nodes: [trigger, end],
    connections: [conn],
    versions: [],
    tags: [],
    createdBy: 'test-user',
    lastModifiedBy: 'test-user',
    publishedAt: null,
    publishedBy: null,
  };
}

/**
 * Create a workflow with a trigger → ai_agent → end chain (cost > 0).
 */
export function createAiWorkflow(): Workflow {
  const trigger = makeNode({
    id: 'n_trigger',
    type: 'trigger',
    label: 'Start',
    positionX: 100,
    positionY: 100,
    config: { eventType: 'manual' },
  });
  const ai = makeNode({
    id: 'n_ai',
    type: 'ai_agent',
    label: 'AI Agent',
    positionX: 350,
    positionY: 100,
    config: { agentId: 'agent-1', prompt: 'Process the input', maxTokens: 1024 },
  });
  const end = makeNode({
    id: 'n_end',
    type: 'end',
    label: 'End',
    positionX: 600,
    positionY: 100,
    config: {},
  });
  const c1 = makeConnection({ id: 'c_1', fromNodeId: 'n_trigger', toNodeId: 'n_ai' });
  const c2 = makeConnection({ id: 'c_2', fromNodeId: 'n_ai', toNodeId: 'n_end' });
  return {
    id: 'wf-ai',
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    metadata: {},
    organizationId: 'test-org',
    name: 'AI Workflow',
    description: 'trigger→ai_agent→end',
    category: 'custom',
    status: 'draft',
    currentVersion: 1,
    nodes: [trigger, ai, end],
    connections: [c1, c2],
    versions: [],
    tags: [],
    createdBy: 'test-user',
    lastModifiedBy: 'test-user',
    publishedAt: null,
    publishedBy: null,
  };
}

/**
 * Create a workflow with a trigger → condition → end chain.
 */
export function createConditionWorkflow(): Workflow {
  const trigger = makeNode({
    id: 'n_trigger',
    type: 'trigger',
    label: 'Start',
    positionX: 100,
    positionY: 100,
    config: { eventType: 'manual' },
  });
  const cond = makeNode({
    id: 'n_cond',
    type: 'condition',
    label: 'Check',
    positionX: 350,
    positionY: 100,
    config: { expression: 'value > 10' },
  });
  const end = makeNode({
    id: 'n_end',
    type: 'end',
    label: 'End',
    positionX: 600,
    positionY: 100,
    config: {},
  });
  const c1 = makeConnection({ id: 'c_1', fromNodeId: 'n_trigger', toNodeId: 'n_cond' });
  const c2 = makeConnection({ id: 'c_2', fromNodeId: 'n_cond', toNodeId: 'n_end' });
  return {
    id: 'wf-cond',
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    metadata: {},
    organizationId: 'test-org',
    name: 'Condition Workflow',
    description: 'trigger→condition→end',
    category: 'custom',
    status: 'draft',
    currentVersion: 1,
    nodes: [trigger, cond, end],
    connections: [c1, c2],
    versions: [],
    tags: [],
    createdBy: 'test-user',
    lastModifiedBy: 'test-user',
    publishedAt: null,
    publishedBy: null,
  };
}

/**
 * Create a workflow with parallel branches:
 *   trigger → condition → (end_true, end_false)
 */
export function createBranchingWorkflow(): Workflow {
  const trigger = makeNode({
    id: 'n_trigger',
    type: 'trigger',
    label: 'Start',
    positionX: 100,
    positionY: 200,
    config: { eventType: 'manual' },
  });
  const decision = makeNode({
    id: 'n_decision',
    type: 'decision',
    label: 'Branch',
    positionX: 350,
    positionY: 200,
    config: { expression: 'value > 10' },
  });
  const endTrue = makeNode({
    id: 'n_end_true',
    type: 'end',
    label: 'End True',
    positionX: 600,
    positionY: 100,
    config: {},
  });
  const endFalse = makeNode({
    id: 'n_end_false',
    type: 'end',
    label: 'End False',
    positionX: 600,
    positionY: 300,
    config: {},
  });
  const c1 = makeConnection({ id: 'c_1', fromNodeId: 'n_trigger', toNodeId: 'n_decision' });
  const c2 = makeConnection({
    id: 'c_2',
    fromNodeId: 'n_decision',
    toNodeId: 'n_end_true',
    fromPort: 'true',
  });
  const c3 = makeConnection({
    id: 'c_3',
    fromNodeId: 'n_decision',
    toNodeId: 'n_end_false',
    fromPort: 'false',
  });
  return {
    id: 'wf-branch',
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    metadata: {},
    organizationId: 'test-org',
    name: 'Branching Workflow',
    description: 'trigger→decision→(end_true, end_false)',
    category: 'custom',
    status: 'draft',
    currentVersion: 1,
    nodes: [trigger, decision, endTrue, endFalse],
    connections: [c1, c2, c3],
    versions: [],
    tags: [],
    createdBy: 'test-user',
    lastModifiedBy: 'test-user',
    publishedAt: null,
    publishedBy: null,
  };
}

/**
 * Create a workflow using connector node types (gmail_trigger → gmail_send → end).
 * Node types are cast to NodeType since connector types extend beyond the union.
 */
export function createConnectorWorkflow(): Workflow {
  const trigger = makeNode({
    id: 'n_gmail_trigger',
    type: 'gmail_trigger' as unknown as NodeType,
    label: 'Gmail Trigger',
    positionX: 100,
    positionY: 100,
    config: { query: 'is:unread' },
  });
  const send = makeNode({
    id: 'n_gmail_send',
    type: 'gmail_send' as unknown as NodeType,
    label: 'Send Email',
    positionX: 400,
    positionY: 100,
    config: { to: 'user@example.com', subject: 'Hello', body: 'World' },
  });
  const end = makeNode({
    id: 'n_end',
    type: 'end',
    label: 'End',
    positionX: 700,
    positionY: 100,
    config: {},
  });
  const c1 = makeConnection({ id: 'c_1', fromNodeId: 'n_gmail_trigger', toNodeId: 'n_gmail_send' });
  const c2 = makeConnection({ id: 'c_2', fromNodeId: 'n_gmail_send', toNodeId: 'n_end' });
  return {
    id: 'wf-connector',
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    metadata: {},
    organizationId: 'test-org',
    name: 'Connector Workflow',
    description: 'gmail_trigger→gmail_send→end',
    category: 'custom',
    status: 'draft',
    currentVersion: 1,
    nodes: [trigger, send, end],
    connections: [c1, c2],
    versions: [],
    tags: [],
    createdBy: 'test-user',
    lastModifiedBy: 'test-user',
    publishedAt: null,
    publishedBy: null,
  };
}

/**
 * Generate a large workflow with `nodeCount` nodes in a linear chain:
 *   trigger → action → action → ... → end
 * Uses 'tool' as the intermediate action node type.
 */
export function generateLargeWorkflow(nodeCount: number): {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
} {
  const nodes: WorkflowNode[] = [];
  const connections: WorkflowConnection[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const isFirst = i === 0;
    const isLast = i === nodeCount - 1;
    const type: NodeType = isFirst ? 'trigger' : isLast ? 'end' : 'tool';
    const config: Record<string, unknown> = isFirst
      ? { eventType: 'manual' }
      : isLast
        ? {}
        : { toolId: `tool-${i}`, config: {} };
    nodes.push(
      makeNode({
        id: `n_${i}`,
        type,
        label: isFirst ? 'Start' : isLast ? 'End' : `Step ${i}`,
        positionX: (i % 10) * 250,
        positionY: Math.floor(i / 10) * 120,
        config,
      }),
    );
    if (i > 0) {
      connections.push(
        makeConnection({
          id: `c_${i}`,
          fromNodeId: `n_${i - 1}`,
          toNodeId: `n_${i}`,
        }),
      );
    }
  }
  return { nodes, connections };
}

/**
 * Generate a large workflow with parallel branches for variety.
 * Structure: trigger → branch into N parallel tool chains → merge → end
 */
export function generateBranchedWorkflow(branchCount: number, chainLength: number): {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
} {
  const nodes: WorkflowNode[] = [];
  const connections: WorkflowConnection[] = [];
  let nodeIdx = 0;
  let connIdx = 0;

  const trigger = makeNode({
    id: `n_${nodeIdx}`,
    type: 'trigger',
    label: 'Start',
    positionX: 0,
    positionY: 0,
    config: { eventType: 'manual' },
  });
  nodes.push(trigger);
  const triggerId = trigger.id;
  nodeIdx++;

  const branchEndIds: string[] = [];
  for (let b = 0; b < branchCount; b++) {
    let prevId = triggerId;
    for (let c = 0; c < chainLength; c++) {
      const node = makeNode({
        id: `n_${nodeIdx}`,
        type: 'tool',
        label: `Branch-${b}-Step-${c}`,
        positionX: (c + 1) * 250,
        positionY: b * 150,
        config: { toolId: `tool-${b}-${c}`, config: {} },
      });
      nodes.push(node);
      connections.push(
        makeConnection({
          id: `c_${connIdx}`,
          fromNodeId: prevId,
          toNodeId: node.id,
        }),
      );
      connIdx++;
      prevId = node.id;
      nodeIdx++;
    }
    branchEndIds.push(prevId);
  }

  const end = makeNode({
    id: `n_${nodeIdx}`,
    type: 'end',
    label: 'End',
    positionX: (chainLength + 2) * 250,
    positionY: 0,
    config: {},
  });
  nodes.push(end);
  for (const bid of branchEndIds) {
    connections.push(
      makeConnection({
        id: `c_${connIdx}`,
        fromNodeId: bid,
        toNodeId: end.id,
      }),
    );
    connIdx++;
  }

  return { nodes, connections };
}

/**
 * Build a Workflow object from nodes and connections.
 */
export function buildWorkflow(
  nodes: WorkflowNode[],
  connections: WorkflowConnection[],
  overrides: Partial<Workflow> = {},
): Workflow {
  return {
    id: 'wf-test',
    version: 1,
    createdAt: NOW,
    updatedAt: NOW,
    metadata: {},
    organizationId: 'test-org',
    name: 'Test Workflow',
    description: 'A test workflow',
    category: 'custom',
    status: 'draft',
    currentVersion: 1,
    nodes,
    connections,
    versions: [],
    tags: [],
    createdBy: 'test-user',
    lastModifiedBy: 'test-user',
    publishedAt: null,
    publishedBy: null,
    ...overrides,
  };
}

/**
 * Build a workflow with version history (snapshots).
 */
export function buildWorkflowWithVersions(
  versions: Array<{
    version: number;
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
    status?: string;
    changelog?: string;
  }>,
): Workflow {
  const wfVersions: WorkflowVersion[] = versions.map((v) => ({
    version: v.version,
    status: (v.status as Workflow['status']) ?? 'draft',
    publishedAt: null,
    publishedBy: null,
    changelog: v.changelog ?? `Version ${v.version}`,
    snapshot: {
      nodes: v.nodes,
      connections: v.connections,
      version: v.version,
      capturedAt: NOW,
    },
  }));
  const latest = versions[versions.length - 1];
  return buildWorkflow(latest?.nodes ?? [], latest?.connections ?? [], {
    id: 'wf-versioned',
    name: 'Versioned Workflow',
    currentVersion: latest?.version ?? 1,
    versions: wfVersions,
  });
}

/**
 * Create a CopilotWorkflowImport for testing:
 * 5 nodes: trigger → drive → condition → github → calendar
 */
export function createCopilotImport(): CopilotWorkflowImport {
  return {
    id: 'copilot-1',
    name: 'Copilot Import Test',
    description: 'A test Copilot workflow import',
    steps: [
      {
        id: 's_trigger',
        type: 'trigger',
        name: 'Start',
        connectorId: null,
        capability: null,
        parameters: { eventType: 'manual' },
        dependsOn: [],
      },
      {
        id: 's_drive',
        type: 'drive_upload',
        name: 'Upload File',
        connectorId: 'google-drive',
        capability: 'upload',
        parameters: { fileName: 'test.txt', folderId: 'folder-1' },
        dependsOn: ['s_trigger'],
      },
      {
        id: 's_condition',
        type: 'condition',
        name: 'Check Result',
        connectorId: null,
        capability: null,
        parameters: { expression: 'success == true' },
        dependsOn: ['s_drive'],
      },
      {
        id: 's_github',
        type: 'github_create_issue',
        name: 'Create Issue',
        connectorId: 'github',
        capability: 'create_issue',
        parameters: { repository: 'owner/repo', title: 'Test Issue' },
        dependsOn: ['s_condition'],
      },
      {
        id: 's_calendar',
        type: 'calendar_create',
        name: 'Create Event',
        connectorId: 'google-calendar',
        capability: 'create',
        parameters: { summary: 'Follow-up', start: '2026-01-01T10:00:00Z', end: '2026-01-01T11:00:00Z' },
        dependsOn: ['s_github'],
      },
    ],
    dag: {
      nodes: [
        { id: 's_trigger', type: 'trigger', label: 'Start', connectorId: null, capabilityName: null },
        { id: 's_drive', type: 'drive_upload', label: 'Upload File', connectorId: 'google-drive', capabilityName: 'upload' },
        { id: 's_condition', type: 'condition', label: 'Check Result', connectorId: null, capabilityName: null },
        { id: 's_github', type: 'github_create_issue', label: 'Create Issue', connectorId: 'github', capabilityName: 'create_issue' },
        { id: 's_calendar', type: 'calendar_create', label: 'Create Event', connectorId: 'google-calendar', capabilityName: 'create' },
      ],
      edges: [
        { from: 's_trigger', to: 's_drive' },
        { from: 's_drive', to: 's_condition' },
        { from: 's_condition', to: 's_github' },
        { from: 's_github', to: 's_calendar' },
      ],
    },
  };
}

/**
 * Create a valid ExportFormat for import testing.
 */
export function createExportFormat(): ExportFormat {
  return {
    format: 'json',
    version: '1.0.0',
    exportedAt: NOW,
    workflow: {
      name: 'Exported Workflow',
      description: 'An exported workflow',
      category: 'custom',
      tags: ['test'],
      nodes: [
        { type: 'trigger', label: 'Start', positionX: 100, positionY: 100, config: { eventType: 'manual' } },
        { type: 'tool', label: 'Do Work', positionX: 350, positionY: 100, config: { toolId: 't1', config: {} } },
        { type: 'end', label: 'End', positionX: 600, positionY: 100, config: {} },
      ],
      connections: [
        { fromLabel: 'Start', toLabel: 'Do Work', fromPort: 'out', toPort: 'in' },
        { fromLabel: 'Do Work', toLabel: 'End', fromPort: 'out', toPort: 'in' },
      ],
    },
  };
}

/**
 * A mock runtime adapter that is available and returns a deployment ID.
 */
export class MockRuntimeAdapter {
  available: boolean;
  constructor(available: boolean = true) {
    this.available = available;
  }
  async deploy(_wf: string, _ver: number, _snap: unknown): Promise<string> {
    return 'mock-deployment-id';
  }
  async undeploy(_id: string): Promise<void> {}
  isAvailable(): boolean {
    return this.available;
  }
}

/**
 * A mock connector source for testing getAvailableConnectors / generateConnectorNodes.
 */
export class MockConnectorSource {
  private readonly connectors: Array<{ connectorId: string; displayName: string; capabilities: Array<{ name: string; description: string; method: string }> }>;
  constructor() {
    this.connectors = [
      {
        connectorId: 'slack',
        displayName: 'Slack',
        capabilities: [
          { name: 'send_message', description: 'Send a Slack message', method: 'post' },
          { name: 'list_channels', description: 'List Slack channels', method: 'get' },
        ],
      },
    ];
  }
  getConnectors() {
    return this.connectors.map((c) => ({
      connectorId: c.connectorId,
      displayName: c.displayName,
      capabilities: c.capabilities,
    }));
  }
  getConnector(id: string) {
    const c = this.connectors.find((x) => x.connectorId === id);
    return c ? { connectorId: c.connectorId, displayName: c.displayName, capabilities: c.capabilities } : null;
  }
  getCapabilities(connectorId: string) {
    return this.connectors.find((c) => c.connectorId === connectorId)?.capabilities ?? [];
  }
  hasConnector(id: string): boolean {
    return this.connectors.some((c) => c.connectorId === id);
  }
}
