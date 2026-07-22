// ─── Runtime policies ───────────────────────────────────────────────────────────
// Business rules governing the runtime — approvals, idempotency, tenant isolation.

import type { RuntimeRequest } from '../models/RuntimeRequest';
import type { WorkflowDefinition } from '../models/WorkflowModels';
import type { RuntimeCheckpoint } from '../models/CheckpointModels';
import type { ResumeToken } from '../models/CheckpointModels';
import type { RiskLevel } from '../../core/intelligence/planning/models/PlanRisk';

const MAX_RETRIES = 5;
const MAX_NODES = 100;
const MAX_DURATION_MS = 300_000;

/** Policy: validate runtime request. */
export function validateRequest(req: RuntimeRequest): string[] {
  const errors: string[] = [];
  if (!req.requestId) errors.push('requestId is required.');
  if (!req.organizationId) errors.push('organizationId is required.');
  if (!req.idempotencyKey) errors.push('idempotencyKey is required.');
  if (req.maxDurationMs <= 0) errors.push('maxDurationMs must be positive.');
  if (req.maxDurationMs > MAX_DURATION_MS) errors.push(`maxDurationMs exceeds limit of ${MAX_DURATION_MS}ms.`);
  if (req.minimumConfidenceThreshold < 0 || req.minimumConfidenceThreshold > 100) {
    errors.push('minimumConfidenceThreshold must be between 0 and 100.');
  }
  return errors;
}

/** Policy: check tenant isolation. */
export function checkTenantAccess(organizationId: string, expectedOrgId: string): boolean {
  return organizationId === expectedOrgId;
}

/** Policy: validate workflow definition — no cycles, max nodes, valid structure. */
export function validateWorkflowDefinition(def: WorkflowDefinition): string[] {
  const errors: string[] = [];
  if (!def.workflowId) errors.push('workflowId is required.');
  if (!def.organizationId) errors.push('organizationId is required.');
  if (def.nodes.length === 0) errors.push('Workflow must have at least one node.');
  if (def.nodes.length > MAX_NODES) errors.push(`Workflow exceeds max node limit of ${MAX_NODES}.`);

  // Check for duplicate node IDs
  const nodeIds = new Set<string>();
  for (const node of def.nodes) {
    if (nodeIds.has(node.nodeId)) errors.push(`Duplicate node ID: ${node.nodeId}.`);
    nodeIds.add(node.nodeId);
  }

  // Check dependencies reference valid nodes
  for (const node of def.nodes) {
    for (const dep of node.dependsOn) {
      if (!nodeIds.has(dep)) errors.push(`Node ${node.nodeId} depends on unknown node: ${dep}.`);
    }
  }

  // Check for cycles using DFS
  const cycleError = detectCycles(def.nodes);
  if (cycleError) errors.push(cycleError);

  return errors;
}

/** Policy: detect cycles in the workflow graph using DFS. */
export function detectCycles(nodes: WorkflowDefinition['nodes']): string | null {
  const graph = new Map<string, string[]>();
  for (const node of nodes) {
    graph.set(node.nodeId, node.dependsOn);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const node of nodes) color.set(node.nodeId, WHITE);

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY);
    const deps = graph.get(nodeId) ?? [];
    for (const dep of deps) {
      const c = color.get(dep);
      if (c === GRAY) return true; // back edge → cycle
      if (c === WHITE && dfs(dep)) return true;
    }
    color.set(nodeId, BLACK);
    return false;
  }

  for (const node of nodes) {
    if (color.get(node.nodeId) === WHITE) {
      if (dfs(node.nodeId)) return `Cycle detected involving node ${node.nodeId}.`;
    }
  }
  return null;
}

/** Policy: validate that a checkpoint is compatible with the current workflow. */
export function validateCheckpointCompatibility(
  checkpoint: RuntimeCheckpoint,
  currentContentHash: string,
): boolean {
  return checkpoint.contentHash === currentContentHash;
}

/** Policy: validate a resume token. */
export function validateResumeToken(
  token: ResumeToken,
  currentContentHash: string,
  now: string,
): { valid: boolean; error: string | null } {
  if (token.consumed) return { valid: false, error: 'Token already consumed.' };
  if (token.expiresAt && new Date(token.expiresAt) < new Date(now)) {
    return { valid: false, error: 'Token expired.' };
  }
  if (token.contentHash !== currentContentHash) {
    return { valid: false, error: 'Content hash mismatch — workflow changed.' };
  }
  return { valid: true, error: null };
}

/** Policy: determine if approval is required for a node. */
export function shouldRequireApproval(
  riskLevel: RiskLevel,
  confidenceScore: number,
  confidenceThreshold: number,
  nodeRequiresApproval: boolean,
): boolean {
  if (nodeRequiresApproval) return true;
  if (riskLevel === 'HIGH' || riskLevel === 'CRITICAL') return true;
  if (confidenceScore < confidenceThreshold) return true;
  return false;
}

/** Policy: validate retry limits. */
export function validateRetryLimit(retries: number): boolean {
  return retries <= MAX_RETRIES;
}

/** Policy: compute workflow content hash (deterministic). */
export function computeContentHash(def: WorkflowDefinition): string {
  const nodeIds = def.nodes.map(n => `${n.nodeId}:${n.type}:${n.order}`).sort().join('|');
  const depStr = def.nodes.map(n => `${n.nodeId}->[${n.dependsOn.sort().join(',')}]`).sort().join(';');
  return `hash:${nodeIds}::${depStr}`;
}

/** Policy: exclude sensitive data from logs. */
export function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('token') || key.toLowerCase().includes('credential') ||
        key.toLowerCase().includes('apikey') || key.toLowerCase().includes('private')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
