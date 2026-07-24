import type { ICopilotConnectorRegistry } from '../connectors/interfaces.js';
import type { DAGNode, WorkflowDAG } from '../planner/models.js';
import type { ValidationIssue, ValidationResult } from './models.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeError(
  code: string,
  message: string,
  nodeId: string | null = null,
  field: string | null = null,
  suggestion: string | null = null,
): ValidationIssue {
  return { code, severity: 'error', message, nodeId, field, suggestion };
}

function makeWarning(
  code: string,
  message: string,
  nodeId: string | null = null,
  field: string | null = null,
  suggestion: string | null = null,
): ValidationIssue {
  return { code, severity: 'warning', message, nodeId, field, suggestion };
}

function makeInfo(
  code: string,
  message: string,
  nodeId: string | null = null,
  field: string | null = null,
  suggestion: string | null = null,
): ValidationIssue {
  return { code, severity: 'info', message, nodeId, field, suggestion };
}

// ---------------------------------------------------------------------------
// Cycle detection via DFS with 3-colour marking
// ---------------------------------------------------------------------------

type Color = 'white' | 'gray' | 'black';

function hasCycle(nodes: DAGNode[], edges: Array<{ from: string; to: string }>): boolean {
  const adjacency = new Map<string, string[]>();
  for (const n of nodes) adjacency.set(n.id, []);
  for (const e of edges) adjacency.get(e.from)?.push(e.to);

  const color = new Map<string, Color>();
  for (const n of nodes) color.set(n.id, 'white');

  function dfs(id: string): boolean {
    color.set(id, 'gray');
    for (const neighbor of adjacency.get(id) ?? []) {
      const c = color.get(neighbor);
      if (c === 'gray') return true; // back edge → cycle
      if (c === 'white' && dfs(neighbor)) return true;
    }
    color.set(id, 'black');
    return false;
  }

  for (const n of nodes) {
    if (color.get(n.id) === 'white') {
      if (dfs(n.id)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Reachability BFS from a source node
// ---------------------------------------------------------------------------

function reachableFrom(sourceId: string, edges: Array<{ from: string; to: string }>): Set<string> {
  const visited = new Set<string>();
  const queue = [sourceId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const e of edges) {
      if (e.from === current && !visited.has(e.to)) {
        queue.push(e.to);
      }
    }
  }
  return visited;
}

// ---------------------------------------------------------------------------
// WorkflowValidator
// ---------------------------------------------------------------------------

export class WorkflowValidator {
  validate(dag: WorkflowDAG, registry: ICopilotConnectorRegistry): ValidationResult {
    const issues: ValidationIssue[] = [];

    // ------------------------------------------------------------------
    // Check 1: Exactly one trigger node
    // ------------------------------------------------------------------
    const triggerNodes = dag.nodes.filter((n) => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      issues.push(
        makeError(
          'MISSING_TRIGGER',
          'The workflow has no trigger node. Every workflow must start with a trigger.',
          null,
          null,
          'Add a trigger node (e.g., Gmail new email, GitHub issue created).',
        ),
      );
    } else if (triggerNodes.length > 1) {
      issues.push(
        makeError(
          'MULTIPLE_TRIGGERS',
          `The workflow has ${triggerNodes.length} trigger nodes; only one is allowed.`,
          null,
          null,
          'Remove extra trigger nodes.',
        ),
      );
    }

    // ------------------------------------------------------------------
    // Check 2: No cycles
    // ------------------------------------------------------------------
    if (hasCycle(dag.nodes, dag.edges)) {
      issues.push(
        makeError(
          'CYCLE_DETECTED',
          'The workflow DAG contains a cycle, which would cause an infinite loop.',
          null,
          null,
          'Review the edge definitions and remove any back-edges.',
        ),
      );
    }

    // ------------------------------------------------------------------
    // Check 3: Orphan nodes (no incoming edges, except trigger)
    // ------------------------------------------------------------------
    const nodesWithIncomingEdge = new Set(dag.edges.map((e) => e.to));
    for (const node of dag.nodes) {
      if (node.type === 'trigger') continue;
      if (!nodesWithIncomingEdge.has(node.id)) {
        issues.push(
          makeError(
            'ORPHAN_NODE',
            `Node '${node.label}' (${node.id}) has no incoming edges and is unreachable.`,
            node.id,
            null,
            'Connect this node to a preceding step.',
          ),
        );
      }
    }

    // ------------------------------------------------------------------
    // Check 4: Reachability from trigger
    // ------------------------------------------------------------------
    if (triggerNodes.length === 1) {
      const triggerId = triggerNodes[0].id;
      const reachable = reachableFrom(triggerId, dag.edges);
      for (const node of dag.nodes) {
        if (!reachable.has(node.id)) {
          issues.push(
            makeError(
              'UNREACHABLE_NODE',
              `Node '${node.label}' (${node.id}) is not reachable from the trigger.`,
              node.id,
              null,
              'Ensure all nodes are connected to the main workflow path.',
            ),
          );
        }
      }
    }

    // ------------------------------------------------------------------
    // Check 5: Connector exists in registry
    // ------------------------------------------------------------------
    for (const node of dag.nodes) {
      if (node.connectorId !== null) {
        if (!registry.hasProvider(node.connectorId)) {
          issues.push(
            makeWarning(
              'CONNECTOR_NOT_FOUND',
              `Connector '${node.connectorId}' referenced by node '${node.label}' is not registered.`,
              node.id,
              'connectorId',
              `Ensure the connector '${node.connectorId}' is installed and registered.`,
            ),
          );
        }
      }
    }

    // ------------------------------------------------------------------
    // Check 6: Capability exists on connector
    // ------------------------------------------------------------------
    for (const node of dag.nodes) {
      if (node.connectorId !== null && node.capabilityName !== null) {
        if (registry.hasProvider(node.connectorId)) {
          const provider = registry.getProvider(node.connectorId);
          const caps = provider.getCapabilities();
          const found = caps.some((c) => c.name === node.capabilityName);
          if (!found) {
            issues.push(
              makeWarning(
                'CAPABILITY_NOT_FOUND',
                `Capability '${node.capabilityName}' not found on connector '${node.connectorId}'.`,
                node.id,
                'capabilityName',
                `Check available capabilities for '${node.connectorId}'.`,
              ),
            );
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // Check 7: Variable references
    // ------------------------------------------------------------------
    const producedSoFar = new Set<string>();
    for (const nodeId of dag.executionOrder) {
      const node = dag.nodes.find((n) => n.id === nodeId);
      if (!node) continue;
      for (const varName of node.consumes) {
        if (!producedSoFar.has(varName)) {
          issues.push(
            makeWarning(
              'UNDEFINED_VARIABLE',
              `Node '${node.label}' consumes variable '${varName}' which is not produced by any upstream node.`,
              node.id,
              'consumes',
              `Ensure an upstream node produces '${varName}'.`,
            ),
          );
        }
      }
      for (const varName of node.produces) {
        producedSoFar.add(varName);
      }
    }

    // ------------------------------------------------------------------
    // Check 8: Permission hints for OAuth scopes
    // ------------------------------------------------------------------
    for (const node of dag.nodes) {
      if (node.connectorId !== null && registry.hasProvider(node.connectorId)) {
        const provider = registry.getProvider(node.connectorId);
        if (node.capabilityName) {
          const cap = provider.getCapabilities().find((c) => c.name === node.capabilityName);
          if (cap && cap.requiredScopes.length > 0) {
            issues.push(
              makeInfo(
                'OAUTH_SCOPES_REQUIRED',
                `Node '${node.label}' requires OAuth scopes: ${cap.requiredScopes.join(', ')}.`,
                node.id,
                'capabilityName',
                'Ensure the connected account has granted the necessary OAuth permissions.',
              ),
            );
          }
        }
      }
    }

    // ------------------------------------------------------------------
    // Check 9: Required parameters present (basic check)
    // ------------------------------------------------------------------
    for (const node of dag.nodes) {
      if (node.type === 'action' && Object.keys(node.parameters).length === 0) {
        issues.push(
          makeInfo(
            'NO_PARAMETERS',
            `Action node '${node.label}' has no parameters configured.`,
            node.id,
            'parameters',
            'Configure the required parameters for this action.',
          ),
        );
      }
    }

    // ------------------------------------------------------------------
    // Partition issues
    // ------------------------------------------------------------------
    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    const infos = issues.filter((i) => i.severity === 'info');

    return {
      valid: errors.length === 0,
      issues,
      errors,
      warnings,
      infos,
    };
  }
}
