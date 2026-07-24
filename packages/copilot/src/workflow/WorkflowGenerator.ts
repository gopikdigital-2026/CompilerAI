import type { ParsedIntent } from '../parser/models.js';
import type { DAGNode, WorkflowDAG } from '../planner/models.js';
import type { ValidationResult } from '../validator/models.js';
import type {
  GeneratedWorkflow,
  WorkflowCondition,
  WorkflowParameterValue,
  WorkflowStatus,
  WorkflowStep,
  WorkflowStepType,
} from './models.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _wfCounter = 0;

function makeWorkflowId(): string {
  return `generated_wf_${Date.now()}_${_wfCounter++}`;
}

function nodeTypeToStepType(nodeType: string): WorkflowStepType {
  switch (nodeType) {
    case 'trigger': return 'trigger';
    case 'condition': return 'condition';
    case 'transform': return 'transform';
    default: return 'action';
  }
}

function resolveParameterValue(
  rawValue: unknown,
): WorkflowParameterValue {
  if (typeof rawValue === 'string' && rawValue.startsWith('{{') && rawValue.endsWith('}}')) {
    const ref = rawValue.slice(2, -2).trim();
    return { value: rawValue, type: 'reference', ref };
  }
  if (
    typeof rawValue === 'string' ||
    typeof rawValue === 'number' ||
    typeof rawValue === 'boolean' ||
    rawValue === null
  ) {
    return { value: rawValue as string | number | boolean | null, type: 'literal' };
  }
  // Objects / arrays converted to string representation
  return { value: String(rawValue), type: 'expression' };
}

function nodeToStep(node: DAGNode): WorkflowStep {
  const parameters: Record<string, WorkflowParameterValue> = {};
  for (const [key, val] of Object.entries(node.parameters)) {
    parameters[key] = resolveParameterValue(val);
  }

  // Conditions come from the node parameters if it is a condition node
  const conditions: WorkflowCondition[] = [];
  if (node.type === 'condition') {
    const field = node.parameters['field'];
    const operator = node.parameters['operator'];
    const value = node.parameters['value'];
    if (typeof field === 'string' && typeof operator === 'string') {
      conditions.push({
        field,
        operator,
        value: (value as string | number | boolean | null) ?? null,
      });
    }
  }

  const errorPolicy = (() => {
    switch (node.errorPolicy) {
      case 'retry': return 'retry' as const;
      case 'continue': return 'continue' as const;
      case 'skip': return 'skip' as const;
      default: return 'fail' as const;
    }
  })();

  return {
    id: node.id,
    type: nodeTypeToStepType(node.type),
    name: node.label,
    connectorId: node.connectorId,
    capability: node.capabilityName,
    parameters,
    conditions,
    errorPolicy,
    timeoutMs: node.timeoutMs,
    retries: node.retries,
    dependsOn: node.dependsOn,
  };
}

// ---------------------------------------------------------------------------
// WorkflowGenerator
// ---------------------------------------------------------------------------

export class WorkflowGenerator {
  generate(
    dag: WorkflowDAG,
    intent: ParsedIntent,
    validation: ValidationResult,
  ): GeneratedWorkflow {
    const triggerNode = dag.nodes.find((n) => n.type === 'trigger');
    const nonTriggerNodes = dag.nodes.filter((n) => n.type !== 'trigger');

    const triggerStep: WorkflowStep = triggerNode
      ? nodeToStep(triggerNode)
      : {
          id: 'node_trigger_fallback',
          type: 'trigger',
          name: intent.trigger.description,
          connectorId: intent.trigger.connectorId,
          capability: intent.trigger.capabilityName,
          parameters: {},
          conditions: [],
          errorPolicy: 'fail',
          timeoutMs: 30000,
          retries: 0,
          dependsOn: [],
        };

    const steps: WorkflowStep[] = nonTriggerNodes.map((n) => nodeToStep(n));

    const status: WorkflowStatus = validation.valid ? 'valid' : 'invalid';

    return {
      id: makeWorkflowId(),
      name: dag.name,
      description: dag.description,
      version: '1.0.0',
      status,
      trigger: triggerStep,
      steps,
      dag,
      createdAt: new Date().toISOString(),
      metadata: {
        sourceInstruction: intent.rawInstruction,
        parserConfidence: intent.confidence,
        validationResult: validation,
        estimatedDurationMs: dag.estimatedDurationMs,
        requiredConnectors: dag.requiredConnectors,
      },
    };
  }
}
