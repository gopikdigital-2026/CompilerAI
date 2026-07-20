import type { IPlanValidator } from '../interfaces/IPlanValidator';
import type { IntentResult } from '../../intent/models/IntentResult';
import type { ExecutionGraph } from '../models/ExecutionGraph';
import type {
  PlanValidationResult, PlanValidationError, PlanValidationWarning,
} from '../models/PlanValidationResult';
import type { PlanStatus } from '../models/PlanStatus';

// ─── Plan Validator ───────────────────────────────────────────────────────────
// Validates the execution graph for structural and semantic coherence.

const MIN_CONFIDENCE = 40;

export class PlanValidator implements IPlanValidator {
  readonly id = 'plan-validator-v1';

  validate(graph: ExecutionGraph, intent: IntentResult): PlanValidationResult {
    const errors: PlanValidationError[] = [];
    const warnings: PlanValidationWarning[] = [];
    const blockers: string[] = [];

    const nodeIds = new Set(graph.nodes.map(n => n.nodeId));

    // ── Structural checks ──────────────────────────────────────────────────────
    if (graph.nodes.length === 0) {
      errors.push({ code: 'EMPTY_GRAPH', message: 'Graph has no nodes' });
    }

    // Self-dependencies
    for (const node of graph.nodes) {
      if (node.dependencies.includes(node.nodeId)) {
        errors.push({
          code: 'SELF_DEPENDENCY',
          message: 'Node depends on itself',
          nodeId: node.nodeId,
        });
      }
    }

    // Dangling edge references
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.sourceNodeId)) {
        errors.push({
          code: 'EDGE_INVALID_SOURCE',
          message: 'Edge references non-existent source node',
          edgeId: edge.edgeId,
        });
      }
      if (!nodeIds.has(edge.targetNodeId)) {
        errors.push({
          code: 'EDGE_INVALID_TARGET',
          message: 'Edge references non-existent target node',
          edgeId: edge.edgeId,
        });
      }
    }

    // Entry / terminal nodes
    if (graph.entryNodeIds.length === 0 && graph.nodes.length > 0) {
      errors.push({ code: 'NO_ENTRY', message: 'Graph has no entry nodes' });
    }
    if (graph.terminalNodeIds.length === 0 && graph.nodes.length > 0) {
      errors.push({ code: 'NO_TERMINAL', message: 'Graph has no terminal nodes' });
    }

    // Final synthesis
    const hasSynthesis = graph.nodes.some(n => n.type === 'FINAL_SYNTHESIS');
    if (!hasSynthesis) {
      errors.push({ code: 'NO_SYNTHESIS', message: 'Graph must contain a FINAL_SYNTHESIS node' });
    }

    // Disconnected nodes
    const connected = new Set<string>();
    for (const edge of graph.edges) {
      connected.add(edge.sourceNodeId);
      connected.add(edge.targetNodeId);
    }
    for (const node of graph.nodes) {
      if (graph.nodes.length > 1 && !connected.has(node.nodeId)) {
        warnings.push({
          code: 'DISCONNECTED_NODE',
          message: 'Node is not connected to any edge',
          nodeId: node.nodeId,
        });
      }
    }

    // ── Coherence with IntentResult ─────────────────────────────────────────────
    if (intent.status === 'BLOCKED') {
      blockers.push('Intent is blocked — planning cannot proceed.');
    }
    if (intent.requiresClarification) {
      blockers.push('Intent requires clarification — plan may be incomplete.');
    }

    // ── Capability coverage ─────────────────────────────────────────────────────
    const intentCapabilities = new Set(intent.requiredCapabilities);
    const planCapabilities = new Set(
      graph.nodes.flatMap(n => n.requiredCapabilities)
    );
    for (const cap of intentCapabilities) {
      if (!planCapabilities.has(cap) && cap !== 'HUMAN_APPROVAL') {
        warnings.push({
          code: 'MISSING_CAPABILITY',
          message: `Required capability "${cap}" is not covered by any node`,
        });
      }
    }

    // ── Unavailable inputs ──────────────────────────────────────────────────────
    for (const node of graph.nodes) {
      for (const input of node.inputs) {
        if (!input.available) {
          warnings.push({
            code: 'UNAVAILABLE_INPUT',
            message: `Input "${input.name}" is not yet available`,
            nodeId: node.nodeId,
          });
        }
      }
    }

    // ── Human approval ──────────────────────────────────────────────────────────
    const approvalNodes = graph.nodes.filter(n => n.requiresHumanApproval);
    if (approvalNodes.length > 0) {
      warnings.push({
        code: 'APPROVAL_REQUIRED',
        message: `${approvalNodes.length} node(s) require human approval`,
      });
    }

    // ── Confidence ──────────────────────────────────────────────────────────────
    const confidenceScore = this.computeConfidence(graph, intent, errors, warnings);

    if (intent.confidenceScore < MIN_CONFIDENCE) {
      blockers.push(`Intent confidence (${intent.confidenceScore}) is below minimum (${MIN_CONFIDENCE}).`);
    }

    // ── Recommended status ──────────────────────────────────────────────────────
    const recommendedStatus = this.deriveStatus(errors, blockers, intent, graph);

    return {
      isValid: errors.length === 0 && blockers.length === 0,
      errors,
      warnings,
      blockers,
      confidenceScore,
      recommendedStatus,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private computeConfidence(
    graph: ExecutionGraph, intent: IntentResult,
    errors: PlanValidationError[], warnings: PlanValidationWarning[],
  ): number {
    let confidence = intent.confidenceScore;
    confidence -= errors.length * 15;
    confidence -= warnings.length * 3;
    confidence += Math.min(20, graph.nodes.filter(n => n.type === 'FINAL_SYNTHESIS').length * 20);
    return Math.max(0, Math.min(100, confidence));
  }

  private deriveStatus(
    errors: PlanValidationError[], blockers: string[],
    _intent: IntentResult, graph: ExecutionGraph,
  ): PlanStatus {
    if (errors.length > 0) return 'INVALID';
    if (blockers.some(b => b.includes('blocked'))) return 'BLOCKED';
    if (blockers.some(b => b.includes('clarification'))) return 'NEEDS_CLARIFICATION';

    // Human approval takes priority over data needs — a plan that requires
    // approval is not actionable regardless of data availability.
    const hasApproval = graph.nodes.some(n => n.requiresHumanApproval);
    if (hasApproval) return 'REQUIRES_APPROVAL';

    if (blockers.some(b => b.includes('confidence'))) return 'NEEDS_DATA';

    const hasUnavailableInputs = graph.nodes.some(n => n.inputs.some(i => !i.available));
    if (hasUnavailableInputs) return 'NEEDS_DATA';

    return 'READY';
  }
}
