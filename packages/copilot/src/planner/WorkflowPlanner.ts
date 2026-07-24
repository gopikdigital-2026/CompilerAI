import type { ICopilotConnectorRegistry } from '../connectors/interfaces.js';
import type { ParsedAction, ParsedIntent } from '../parser/models.js';
import type { DAGEdge, DAGNode, ErrorPolicy, WorkflowDAG } from './models.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

let _nodeCounter = 0;
let _edgeCounter = 0;

function resetCounters(): void {
  _nodeCounter = 0;
  _edgeCounter = 0;
}

function makeNodeId(type: string): string {
  return `node_${type}_${_nodeCounter++}`;
}

function makeEdgeId(): string {
  return `edge_${_edgeCounter++}`;
}

function makeWorkflowId(): string {
  return `wf_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// ---------------------------------------------------------------------------
// Connector / capability mapping
// ---------------------------------------------------------------------------

interface ConnectorMapping {
  connectorId: string;
  capabilityName: string;
}

/** Derive a definitive connector mapping for a parsed action */
function resolveConnector(action: ParsedAction): ConnectorMapping | null {
  if (action.connectorId && action.capabilityName) {
    return { connectorId: action.connectorId, capabilityName: action.capabilityName };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Duration estimation
// ---------------------------------------------------------------------------

const CONNECTOR_DURATIONS: Record<string, number> = {
  'google-workspace': 3000,
  github: 2500,
  slack: 1500,
  jira: 3000,
  notion: 2000,
  hubspot: 3000,
  salesforce: 4000,
  stripe: 2500,
};

function estimateNodeDuration(connectorId: string | null, nodeType: string): number {
  if (nodeType === 'trigger') return 0;
  if (nodeType === 'condition') return 1;
  if (!connectorId) return 1000;
  return CONNECTOR_DURATIONS[connectorId] ?? 2000;
}

// ---------------------------------------------------------------------------
// Error policy
// ---------------------------------------------------------------------------

function determineErrorPolicy(nodeType: string, capabilityName: string | null): ErrorPolicy {
  if (nodeType === 'trigger') return 'fail';
  if (nodeType === 'condition') return 'continue';
  // Read operations: retry
  if (capabilityName && (capabilityName.includes('.read') || capabilityName.includes('.list'))) {
    return 'retry';
  }
  // Write operations: fail
  return 'fail';
}

// ---------------------------------------------------------------------------
// Variable flow analysis
// ---------------------------------------------------------------------------

const CAPABILITY_PRODUCES: Record<string, string[]> = {
  'gmail.messages.read': ['email.subject', 'email.body', 'email.sender', 'email.receivedAt', 'email.attachments'],
  'drive.files.write': ['drive.fileId', 'drive.fileUrl'],
  'github.issues.create': ['github.issueNumber', 'github.issueUrl'],
  'calendar.events.write': ['calendar.eventId'],
  'jira.issues.create': ['jira.issueKey', 'jira.issueUrl'],
  'jira.issues.update': ['jira.issueKey'],
  'slack.messages.send': ['slack.messageTs'],
  'gmail.messages.send': ['gmail.messageId'],
  'notion.pages.create': ['notion.pageId', 'notion.pageUrl'],
  'hubspot.contacts.create': ['hubspot.contactId'],
  'hubspot.contacts.update': ['hubspot.contactId'],
  'github.pullRequests.merged': ['github.prNumber', 'github.prTitle'],
  'github.releases.published': ['github.releaseTag', 'github.releaseName'],
  'github.issues.labeled': ['github.issueNumber', 'github.issueLabel'],
};

const CAPABILITY_CONSUMES: Record<string, string[]> = {
  'drive.files.write': ['email.attachments'],
  'github.issues.create': ['email.subject', 'drive.fileUrl'],
  'calendar.events.write': ['github.issueUrl'],
  'slack.messages.send': ['github.issueUrl', 'jira.issueKey'],
  'gmail.messages.send': ['email.sender'],
};

function getProducedVars(capabilityName: string | null): string[] {
  if (!capabilityName) return [];
  return CAPABILITY_PRODUCES[capabilityName] ?? [];
}

function getConsumedVars(capabilityName: string | null): string[] {
  if (!capabilityName) return [];
  return CAPABILITY_CONSUMES[capabilityName] ?? [];
}

// ---------------------------------------------------------------------------
// Kahn's topological sort
// ---------------------------------------------------------------------------

function topologicalSort(nodes: DAGNode[], edges: DAGEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    adjacency.get(edge.from)?.push(edge.to);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) queue.push(id);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// WorkflowPlanner
// ---------------------------------------------------------------------------

export class WorkflowPlanner {
  plan(intent: ParsedIntent, _registry: ICopilotConnectorRegistry): WorkflowDAG {
    resetCounters();

    const nodes: DAGNode[] = [];
    const edges: DAGEdge[] = [];

    // ------------------------------------------------------------------
    // 1. Trigger node
    // ------------------------------------------------------------------
    const triggerId = makeNodeId('trigger');
    const triggerNode: DAGNode = {
      id: triggerId,
      type: 'trigger',
      label: intent.trigger.description,
      connectorId: intent.trigger.connectorId,
      capabilityName: intent.trigger.capabilityName,
      operation: intent.trigger.capabilityName,
      parameters: Object.fromEntries(
        Object.entries(intent.trigger.parameters).map(([k, v]) => [k, v.value]),
      ),
      errorPolicy: 'fail',
      timeoutMs: 30000,
      retries: 0,
      dependsOn: [],
      produces: getProducedVars(intent.trigger.capabilityName),
      consumes: [],
    };
    nodes.push(triggerNode);

    // ------------------------------------------------------------------
    // 2. Build action nodes, inserting condition nodes where needed
    // ------------------------------------------------------------------

    // Map condition indices to the action index they guard.
    // Simple heuristic: conditions guard the action that follows them
    // in the instruction (matched by connector).
    // For amount conditions, they typically guard github.issues.create.
    const conditionToActionIndex = new Map<number, number>();
    for (let ci = 0; ci < intent.conditions.length; ci++) {
      const cond = intent.conditions[ci];
      // Find the first action that could be guarded by this condition
      let guardIdx = -1;
      if (cond.field === 'amount') {
        // Guard the first action that isn't a simple read/store
        guardIdx = intent.actions.findIndex(
          (a) => a.type === 'create' && a.connectorId !== 'google-workspace',
        );
        if (guardIdx === -1) {
          guardIdx = intent.actions.findIndex((a) => a.type === 'create');
        }
      } else if (cond.field === 'label') {
        guardIdx = 0;
      } else {
        guardIdx = 0;
      }
      if (guardIdx >= 0) {
        conditionToActionIndex.set(ci, guardIdx);
      }
    }

    // Track the last node id for edge chaining
    let previousNodeId = triggerId;

    // We'll process actions and insert conditions before guarded actions
    const conditionsInserted = new Set<number>();

    for (let ai = 0; ai < intent.actions.length; ai++) {
      // Insert any conditions guarding this action
      for (let ci = 0; ci < intent.conditions.length; ci++) {
        if (conditionToActionIndex.get(ci) === ai && !conditionsInserted.has(ci)) {
          conditionsInserted.add(ci);
          const cond = intent.conditions[ci];
          const condNodeId = makeNodeId('condition');
          const condNode: DAGNode = {
            id: condNodeId,
            type: 'condition',
            label: cond.description,
            connectorId: null,
            capabilityName: null,
            operation: null,
            parameters: {
              field: cond.field,
              operator: cond.operator,
              value: cond.value,
            },
            errorPolicy: 'continue',
            timeoutMs: 1000,
            retries: 0,
            dependsOn: [previousNodeId],
            produces: [],
            consumes: [cond.field],
          };
          nodes.push(condNode);
          edges.push({
            id: makeEdgeId(),
            from: previousNodeId,
            to: condNodeId,
            type: 'always',
            condition: null,
            label: 'next',
          });
          previousNodeId = condNodeId;
        }
      }

      // Create the action node
      const parsedAction = intent.actions[ai];
      const mapping = resolveConnector(parsedAction);
      const actionNodeId = makeNodeId('action');
      const actionNode: DAGNode = {
        id: actionNodeId,
        type: 'action',
        label: parsedAction.description,
        connectorId: mapping?.connectorId ?? null,
        capabilityName: mapping?.capabilityName ?? null,
        operation: mapping?.capabilityName ?? null,
        parameters: Object.fromEntries(
          Object.entries(parsedAction.parameters).map(([k, v]) => [k, v.value]),
        ),
        errorPolicy: determineErrorPolicy('action', mapping?.capabilityName ?? null),
        timeoutMs: 30000,
        retries: determineErrorPolicy('action', mapping?.capabilityName ?? null) === 'retry' ? 3 : 1,
        dependsOn: [previousNodeId],
        produces: getProducedVars(mapping?.capabilityName ?? null),
        consumes: getConsumedVars(mapping?.capabilityName ?? null),
      };
      nodes.push(actionNode);

      // Edge from previous → this action
      const edgeType = previousNodeId.includes('condition') ? 'conditional' : 'success';
      edges.push({
        id: makeEdgeId(),
        from: previousNodeId,
        to: actionNodeId,
        type: edgeType,
        condition: edgeType === 'conditional' ? 'condition_met' : null,
        label: edgeType === 'conditional' ? 'condition met' : 'success',
      });

      previousNodeId = actionNodeId;
    }

    // Insert any remaining unattached conditions at the end (fallback)
    for (let ci = 0; ci < intent.conditions.length; ci++) {
      if (!conditionsInserted.has(ci)) {
        const cond = intent.conditions[ci];
        const condNodeId = makeNodeId('condition');
        const condNode: DAGNode = {
          id: condNodeId,
          type: 'condition',
          label: cond.description,
          connectorId: null,
          capabilityName: null,
          operation: null,
          parameters: { field: cond.field, operator: cond.operator, value: cond.value },
          errorPolicy: 'continue',
          timeoutMs: 1000,
          retries: 0,
          dependsOn: [previousNodeId],
          produces: [],
          consumes: [cond.field],
        };
        nodes.push(condNode);
        edges.push({
          id: makeEdgeId(),
          from: previousNodeId,
          to: condNodeId,
          type: 'always',
          condition: null,
          label: 'next',
        });
        previousNodeId = condNodeId;
      }
    }

    // ------------------------------------------------------------------
    // 3. Topological sort
    // ------------------------------------------------------------------
    const executionOrder = topologicalSort(nodes, edges);

    // ------------------------------------------------------------------
    // 4. Duration estimate
    // ------------------------------------------------------------------
    const estimatedDurationMs = nodes.reduce(
      (sum, n) => sum + estimateNodeDuration(n.connectorId, n.type),
      0,
    );

    // ------------------------------------------------------------------
    // 5. Unique required connectors / capabilities
    // ------------------------------------------------------------------
    const requiredConnectors = [
      ...new Set(nodes.map((n) => n.connectorId).filter((c): c is string => c !== null)),
    ];
    const requiredCapabilities = [
      ...new Set(nodes.map((n) => n.capabilityName).filter((c): c is string => c !== null)),
    ];

    // ------------------------------------------------------------------
    // 6. Derive a name from the instruction
    // ------------------------------------------------------------------
    const name = intent.rawInstruction.length > 60
      ? intent.rawInstruction.slice(0, 57) + '...'
      : intent.rawInstruction;

    return {
      id: makeWorkflowId(),
      name,
      description: intent.rawInstruction,
      nodes,
      edges,
      executionOrder,
      estimatedDurationMs,
      requiredConnectors,
      requiredCapabilities,
    };
  }
}
