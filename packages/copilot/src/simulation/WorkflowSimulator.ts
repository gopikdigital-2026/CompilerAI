import type { ICopilotConnectorRegistry } from '../connectors/interfaces.js';
import type { DAGNode } from '../planner/models.js';
import type { GeneratedWorkflow } from '../workflow/models.js';
import type { SimulationResult, SimulationStep, SimulationStepStatus } from './models.js';

// ---------------------------------------------------------------------------
// Duration estimation per step type
// ---------------------------------------------------------------------------

function estimateStepDuration(node: DAGNode): number {
  if (node.type === 'trigger') return 0;
  if (node.type === 'condition') return 1;
  if (!node.capabilityName) return 500;

  // Read operations are faster than writes
  const name = node.capabilityName.toLowerCase();
  if (name.includes('.read') || name.includes('.list') || name.includes('.get')) {
    return 500;
  }
  return 2000;
}

// ---------------------------------------------------------------------------
// Sample data for condition evaluation
// ---------------------------------------------------------------------------

const SAMPLE_DATA: Record<string, unknown> = {
  'email.subject': 'Invoice #12345 from Vendor Corp',
  'email.body': 'Please find the invoice attached.',
  'email.sender': 'vendor@example.com',
  'email.receivedAt': new Date().toISOString(),
  'email.attachments': [{ name: 'invoice-12345.pdf', size: 204800 }],
  'amount': 6000,            // above 5000 so the condition passes in simulation
  'label': 'critical',
  'openCount': 120,
  'slaBreached': true,
  'drive.fileId': 'sample_file_id_abc123',
  'drive.fileUrl': 'https://drive.google.com/file/d/sample_file_id_abc123',
  'github.issueNumber': 42,
  'github.issueUrl': 'https://github.com/org/repo/issues/42',
  'calendar.eventId': 'sample_calendar_event_id',
  'jira.issueKey': 'PROJ-42',
  'jira.issueUrl': 'https://jira.example.com/browse/PROJ-42',
  'github.prNumber': 101,
  'github.prTitle': 'feat: add invoice processing',
  'github.releaseTag': 'v1.2.0',
  'github.releaseName': 'Release 1.2.0',
  'github.issueLabel': 'critical',
};

function evaluateCondition(
  field: string,
  operator: string,
  value: unknown,
): boolean {
  const sampleValue = SAMPLE_DATA[field];
  if (sampleValue === undefined) return true; // conservative: assume condition passes

  switch (operator) {
    case 'equals': return sampleValue === value;
    case 'contains':
      return typeof sampleValue === 'string' && typeof value === 'string'
        ? sampleValue.toLowerCase().includes(value.toLowerCase())
        : false;
    case 'greater_than':
      return typeof sampleValue === 'number' && typeof value === 'number'
        ? sampleValue > value
        : false;
    case 'less_than':
      return typeof sampleValue === 'number' && typeof value === 'number'
        ? sampleValue < value
        : false;
    case 'starts_with':
      return typeof sampleValue === 'string' && typeof value === 'string'
        ? sampleValue.startsWith(value)
        : false;
    case 'exists': return sampleValue !== undefined && sampleValue !== null;
    case 'not_exists': return sampleValue === undefined || sampleValue === null;
    default: return true;
  }
}

// ---------------------------------------------------------------------------
// WorkflowSimulator
// ---------------------------------------------------------------------------

export class WorkflowSimulator {
  simulate(
    workflow: GeneratedWorkflow,
    registry: ICopilotConnectorRegistry,
  ): SimulationResult {
    const dag = workflow.dag;
    const preflightErrors: string[] = [];
    const preflightWarnings: string[] = [];
    const missingConnectors: string[] = [];
    const requiredPermissions: string[] = [];

    // ------------------------------------------------------------------
    // Pre-flight: check connectors
    // ------------------------------------------------------------------
    for (const connectorId of dag.requiredConnectors) {
      if (!registry.hasProvider(connectorId)) {
        missingConnectors.push(connectorId);
        preflightErrors.push(
          `Connector '${connectorId}' is required but not registered. The workflow cannot run without it.`,
        );
      }
    }

    // ------------------------------------------------------------------
    // Pre-flight: check capabilities + collect OAuth scopes
    // ------------------------------------------------------------------
    for (const capabilityName of dag.requiredCapabilities) {
      // Find which connector owns this capability
      for (const connectorId of dag.requiredConnectors) {
        if (!registry.hasProvider(connectorId)) continue;
        const provider = registry.getProvider(connectorId);
        const cap = provider.getCapabilities().find((c) => c.name === capabilityName);
        if (cap) {
          for (const scope of cap.requiredScopes) {
            if (!requiredPermissions.includes(scope)) {
              requiredPermissions.push(scope);
            }
          }
        }
      }
    }

    if (dag.requiredCapabilities.length > 0) {
      for (const capName of dag.requiredCapabilities) {
        let found = false;
        for (const connectorId of dag.requiredConnectors) {
          if (!registry.hasProvider(connectorId)) continue;
          const provider = registry.getProvider(connectorId);
          if (provider.getCapabilities().some((c) => c.name === capName)) {
            found = true;
            break;
          }
        }
        if (!found) {
          preflightWarnings.push(
            `Capability '${capName}' could not be verified — the owning connector may not be registered.`,
          );
        }
      }
    }

    // ------------------------------------------------------------------
    // Walk the DAG in topological order
    // ------------------------------------------------------------------
    const simulationSteps: SimulationStep[] = [];
    const executionPath: string[] = [];
    const skippedNodes: string[] = [];
    let totalDurationMs = 0;
    let overallSuccess = preflightErrors.length === 0;

    // Track condition outcomes to handle conditional branching
    const conditionResults = new Map<string, boolean>();
    // Track which nodes are "blocked" because their guarding condition failed
    const blockedNodes = new Set<string>();

    for (const nodeId of dag.executionOrder) {
      const node = dag.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      // Determine if any dependency is blocked
      const isBlocked = node.dependsOn.some((depId) => blockedNodes.has(depId));

      if (isBlocked) {
        blockedNodes.add(nodeId);
        skippedNodes.push(nodeId);
        simulationSteps.push({
          nodeId,
          nodeLabel: node.label,
          status: 'conditional_skip',
          estimatedDurationMs: 0,
          inputs: {},
          outputs: {},
          errors: [],
          warnings: [],
          skippedReason: 'Upstream condition was not met.',
        });
        continue;
      }

      const durationMs = estimateStepDuration(node);
      const stepInputs: Record<string, unknown> = {};
      const stepOutputs: Record<string, unknown> = {};
      const stepErrors: string[] = [];
      const stepWarnings: string[] = [];
      let status: SimulationStepStatus = 'success';
      let skippedReason: string | null = null;

      // Populate inputs from sample data
      for (const varName of node.consumes) {
        stepInputs[varName] = SAMPLE_DATA[varName] ?? `<${varName}>`;
      }

      if (node.type === 'trigger') {
        // Trigger always succeeds in simulation
        for (const varName of node.produces) {
          stepOutputs[varName] = SAMPLE_DATA[varName] ?? `<sample:${varName}>`;
        }

      } else if (node.type === 'condition') {
        // Evaluate condition
        const field = node.parameters['field'] as string | undefined;
        const operator = node.parameters['operator'] as string | undefined;
        const value = node.parameters['value'];

        if (field && operator) {
          const conditionMet = evaluateCondition(field, operator, value);
          conditionResults.set(nodeId, conditionMet);
          if (!conditionMet) {
            status = 'conditional_skip';
            skippedReason = `Condition '${field} ${operator} ${String(value)}' was not met in sample data.`;
            skippedNodes.push(nodeId);
            blockedNodes.add(nodeId);
          } else {
            stepOutputs['conditionResult'] = true;
          }
        }

      } else {
        // Action node
        if (node.connectorId && missingConnectors.includes(node.connectorId)) {
          status = 'failure';
          stepErrors.push(`Connector '${node.connectorId}' is not available.`);
          overallSuccess = false;
        } else {
          // Simulate successful execution with sample outputs
          for (const varName of node.produces) {
            stepOutputs[varName] = SAMPLE_DATA[varName] ?? `<sample:${varName}>`;
          }
          if (node.connectorId && !registry.hasProvider(node.connectorId)) {
            stepWarnings.push(
              `Connector '${node.connectorId}' not registered — this step would fail at runtime.`,
            );
          }
        }
      }

      totalDurationMs += durationMs;

      if (status === 'success' || status === 'failure') {
        if (status === 'success') executionPath.push(nodeId);
      } else if (status !== 'conditional_skip') {
        executionPath.push(nodeId);
      }

      simulationSteps.push({
        nodeId,
        nodeLabel: node.label,
        status,
        estimatedDurationMs: durationMs,
        inputs: stepInputs,
        outputs: stepOutputs,
        errors: stepErrors,
        warnings: stepWarnings,
        skippedReason,
      });
    }

    return {
      dryRun: true,
      workflowId: workflow.id,
      workflowName: workflow.name,
      success: overallSuccess,
      steps: simulationSteps,
      totalEstimatedDurationMs: totalDurationMs,
      preflightErrors,
      preflightWarnings,
      executionPath,
      skippedNodes,
      requiredPermissions,
      missingConnectors,
    };
  }
}
