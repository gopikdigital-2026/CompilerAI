import type { NodeDefinition, NodeType } from '../models/WorkflowModels';

const STANDARD_INPUT = { name: 'in', label: 'Input', type: 'input' as const, dataType: 'any', required: true };
const STANDARD_OUTPUT = { name: 'out', label: 'Output', type: 'output' as const, dataType: 'any', required: true };

const DEFINITIONS: Record<NodeType, NodeDefinition> = {
  trigger: {
    type: 'trigger',
    category: 'trigger',
    label: 'Trigger',
    icon: 'zap',
    description: 'Starts the workflow when an event occurs',
    inputs: [],
    outputs: [STANDARD_OUTPUT],
    properties: [
      { name: 'eventType', label: 'Event Type', type: 'select', required: true, defaultValue: 'manual', options: ['manual', 'webhook', 'schedule', 'email'] },
      { name: 'config', label: 'Configuration', type: 'json', required: false, defaultValue: {} },
    ],
    maxInputs: 0,
    maxOutputs: 1,
    allowMultipleOutputs: false,
  },
  ai_agent: {
    type: 'ai_agent',
    category: 'action',
    label: 'AI Agent',
    icon: 'brain',
    description: 'Delegates a task to an AI agent',
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    properties: [
      { name: 'agentId', label: 'Agent ID', type: 'string', required: true, defaultValue: '' },
      { name: 'prompt', label: 'Prompt', type: 'textarea', required: true, defaultValue: '' },
      { name: 'maxTokens', label: 'Max Tokens', type: 'number', required: false, defaultValue: 4096 },
    ],
    maxInputs: 1,
    maxOutputs: 1,
    allowMultipleOutputs: false,
  },
  decision: {
    type: 'decision',
    category: 'logic',
    label: 'Decision',
    icon: 'git-branch',
    description: 'Branches the flow based on a condition',
    inputs: [STANDARD_INPUT],
    outputs: [
      { name: 'true', label: 'True', type: 'output', dataType: 'any', required: false },
      { name: 'false', label: 'False', type: 'output', dataType: 'any', required: false },
    ],
    properties: [
      { name: 'expression', label: 'Expression', type: 'textarea', required: true, defaultValue: '' },
    ],
    maxInputs: 1,
    maxOutputs: 2,
    allowMultipleOutputs: true,
  },
  human_approval: {
    type: 'human_approval',
    category: 'human',
    label: 'Human Approval',
    icon: 'user-check',
    description: 'Pauses execution until a human approves or denies',
    inputs: [STANDARD_INPUT],
    outputs: [
      { name: 'approved', label: 'Approved', type: 'output', dataType: 'any', required: false },
      { name: 'denied', label: 'Denied', type: 'output', dataType: 'any', required: false },
    ],
    properties: [
      { name: 'approverId', label: 'Approver ID', type: 'string', required: true, defaultValue: '' },
      { name: 'message', label: 'Message', type: 'textarea', required: false, defaultValue: '' },
      { name: 'timeoutHours', label: 'Timeout (hours)', type: 'number', required: false, defaultValue: 24 },
    ],
    maxInputs: 1,
    maxOutputs: 2,
    allowMultipleOutputs: true,
  },
  tool: {
    type: 'tool',
    category: 'action',
    label: 'Tool',
    icon: 'wrench',
    description: 'Executes a marketplace tool',
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    properties: [
      { name: 'toolId', label: 'Tool ID', type: 'string', required: true, defaultValue: '' },
      { name: 'config', label: 'Tool Configuration', type: 'json', required: false, defaultValue: {} },
    ],
    maxInputs: 1,
    maxOutputs: 1,
    allowMultipleOutputs: false,
  },
  condition: {
    type: 'condition',
    category: 'logic',
    label: 'Condition',
    icon: 'filter',
    description: 'Filters or transforms data based on a condition',
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    properties: [
      { name: 'expression', label: 'Condition Expression', type: 'textarea', required: true, defaultValue: '' },
    ],
    maxInputs: 1,
    maxOutputs: 1,
    allowMultipleOutputs: false,
  },
  loop: {
    type: 'loop',
    category: 'logic',
    label: 'Loop',
    icon: 'repeat',
    description: 'Iterates over a collection',
    inputs: [STANDARD_INPUT],
    outputs: [
      { name: 'item', label: 'Item', type: 'output', dataType: 'any', required: true },
      { name: 'done', label: 'Done', type: 'output', dataType: 'any', required: false },
    ],
    properties: [
      { name: 'collectionPath', label: 'Collection Path', type: 'string', required: true, defaultValue: '' },
      { name: 'maxIterations', label: 'Max Iterations', type: 'number', required: false, defaultValue: 100 },
    ],
    maxInputs: 1,
    maxOutputs: 2,
    allowMultipleOutputs: true,
  },
  delay: {
    type: 'delay',
    category: 'logic',
    label: 'Delay',
    icon: 'clock',
    description: 'Pauses execution for a specified duration',
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    properties: [
      { name: 'durationMs', label: 'Duration (ms)', type: 'number', required: true, defaultValue: 1000 },
    ],
    maxInputs: 1,
    maxOutputs: 1,
    allowMultipleOutputs: false,
  },
  notification: {
    type: 'notification',
    category: 'action',
    label: 'Notification',
    icon: 'bell',
    description: 'Sends a notification via a channel',
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    properties: [
      { name: 'channel', label: 'Channel', type: 'select', required: true, defaultValue: 'email', options: ['email', 'slack', 'webhook', 'sms'] },
      { name: 'recipient', label: 'Recipient', type: 'string', required: true, defaultValue: '' },
      { name: 'message', label: 'Message', type: 'textarea', required: true, defaultValue: '' },
    ],
    maxInputs: 1,
    maxOutputs: 1,
    allowMultipleOutputs: false,
  },
  end: {
    type: 'end',
    category: 'terminal',
    label: 'End',
    icon: 'square',
    description: 'Terminates the workflow',
    inputs: [STANDARD_INPUT],
    outputs: [],
    properties: [
      { name: 'output', label: 'Output', type: 'json', required: false, defaultValue: {} },
    ],
    maxInputs: 1,
    maxOutputs: 0,
    allowMultipleOutputs: false,
  },
};

export class NodeRegistry {
  private definitions = new Map<NodeType, NodeDefinition>(Object.entries(DEFINITIONS) as [NodeType, NodeDefinition][]);

  getDefinition(type: NodeType): NodeDefinition {
    const def = this.definitions.get(type);
    if (!def) throw new Error(`Unknown node type: ${type}`);
    return def;
  }

  getAllDefinitions(): NodeDefinition[] {
    return Array.from(this.definitions.values());
  }

  getDefinitionsByCategory(category: string): NodeDefinition[] {
    return this.getAllDefinitions().filter((d) => d.category === category);
  }

  isKnownType(type: string): boolean {
    return this.definitions.has(type as NodeType);
  }

  validateNodeConfig(type: NodeType, config: Record<string, unknown>): string[] {
    const def = this.getDefinition(type);
    const errors: string[] = [];
    for (const prop of def.properties) {
      if (prop.required && (config[prop.name] === undefined || config[prop.name] === '' || config[prop.name] === null)) {
        errors.push(`Missing required property: ${prop.label}`);
      }
    }
    return errors;
  }

  validateConnection(
    fromType: NodeType,
    toType: NodeType,
    fromPort: string,
    _toPort: string,
  ): string[] {
    const errors: string[] = [];
    const fromDef = this.getDefinition(fromType);
    const toDef = this.getDefinition(toType);
    const hasOutput = fromDef.outputs.some((p) => p.name === fromPort);
    if (!hasOutput) {
      errors.push(`Node type ${fromType} has no output port named ${fromPort}`);
    }
    if (toDef.maxInputs === 0) {
      errors.push(`Node type ${toType} does not accept any inputs`);
    }
    return errors;
  }

  getDefaultConfig(type: NodeType): Record<string, unknown> {
    const def = this.getDefinition(type);
    const config: Record<string, unknown> = {};
    for (const prop of def.properties) {
      config[prop.name] = prop.defaultValue;
    }
    return config;
  }
}
