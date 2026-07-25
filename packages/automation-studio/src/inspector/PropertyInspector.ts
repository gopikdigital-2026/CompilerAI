import type { WorkflowNode, WorkflowConnection, NodeDefinition, NodePropertyDescriptor } from '../models/WorkflowModels.js';
import { NodeRegistry } from '../designer/NodeRegistry.js';
import { ConnectorNodeLibrary } from '../node-library/ConnectorNodeLibrary.js';

export type InspectorFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'textarea'
  | 'json'
  | 'reference';

export interface InspectorField {
  name: string;
  label: string;
  type: InspectorFieldType;
  value: unknown;
  required: boolean;
  options?: string[];
  description?: string;
  validationErrors: string[];
  availableVariables: string[];
}

export interface InspectorSection {
  title: string;
  fields: InspectorField[];
}

export interface InspectionResult {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  sections: InspectorSection[];
  isValid: boolean;
  errors: string[];
  warnings: string[];
  availableVariables: string[];
}

function descriptorToFieldType(
  type: NodePropertyDescriptor['type'],
): InspectorFieldType {
  return type as InspectorFieldType;
}

export class PropertyInspector {
  private readonly nodeRegistry: NodeRegistry;
  private readonly connectorLibrary: ConnectorNodeLibrary | null;

  constructor(nodeRegistry: NodeRegistry, connectorLibrary: ConnectorNodeLibrary | null = null) {
    this.nodeRegistry = nodeRegistry;
    this.connectorLibrary = connectorLibrary;
  }

  inspect(
    node: WorkflowNode,
    connections: WorkflowConnection[],
    allNodes: WorkflowNode[],
  ): InspectionResult {
    const definition = this.getDefinition(node.type);
    const availableVariables = this.getAvailableVariables(node.id, connections, allNodes);

    const fields: InspectorField[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    if (definition) {
      for (const prop of definition.properties) {
        const value = node.config[prop.name] ?? prop.defaultValue;
        const fieldErrors = this.validateProperty(node.type, prop.name, value);
        const isReference = this.isReferenceField(prop);
        fields.push({
          name: prop.name,
          label: prop.label,
          type: isReference ? 'reference' : descriptorToFieldType(prop.type),
          value,
          required: prop.required,
          options: prop.options,
          description: prop.description,
          validationErrors: fieldErrors,
          availableVariables: isReference ? availableVariables : [],
        });
        for (const e of fieldErrors) errors.push(e);
      }
    } else {
      errors.push(`Unknown node type: ${node.type}`);
    }

    // Section grouping: configuration properties + a "general" section.
    const sections: InspectorSection[] = [];
    const generalFields = fields.filter(
      (f) => f.name === 'label' || f.name === 'type',
    );
    const configFields = fields.filter(
      (f) => f.name !== 'label' && f.name !== 'type',
    );
    if (generalFields.length > 0) {
      sections.push({ title: 'General', fields: generalFields });
    }
    if (configFields.length > 0) {
      sections.push({ title: 'Configuration', fields: configFields });
    }

    return {
      nodeId: node.id,
      nodeType: node.type,
      nodeLabel: node.label,
      sections,
      isValid: errors.length === 0,
      errors,
      warnings,
      availableVariables,
    };
  }

  validateProperty(nodeType: string, propertyName: string, value: unknown): string[] {
    const definition = this.getDefinition(nodeType);
    if (!definition) return [`Unknown node type: ${nodeType}`];

    const prop = definition.properties.find((p) => p.name === propertyName);
    if (!prop) return [`Unknown property: ${propertyName}`];

    const errors: string[] = [];

    if (prop.required && (value === undefined || value === null || value === '')) {
      errors.push(`Missing required property: ${prop.label}`);
      return errors;
    }

    if (value === undefined || value === null || value === '') return errors;

    switch (prop.type) {
      case 'number':
        if (typeof value !== 'number' || Number.isNaN(value)) {
          errors.push(`${prop.label} must be a number`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${prop.label} must be a boolean`);
        }
        break;
      case 'select':
        if (prop.options && typeof value === 'string' && !prop.options.includes(value)) {
          errors.push(`${prop.label} must be one of: ${prop.options.join(', ')}`);
        }
        break;
      case 'json':
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
          } catch {
            errors.push(`${prop.label} is not valid JSON`);
          }
        } else if (typeof value !== 'object' || value === null) {
          errors.push(`${prop.label} must be a JSON object`);
        }
        break;
      case 'string':
      case 'textarea':
        if (typeof value !== 'string') {
          errors.push(`${prop.label} must be a string`);
        }
        break;
      default:
        break;
    }

    return errors;
  }

  getAvailableVariables(
    nodeId: string,
    connections: WorkflowConnection[],
    allNodes: WorkflowNode[],
  ): string[] {
    const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
    // Build reverse adjacency (toNodeId -> fromNodeId[]).
    const reverse = new Map<string, string[]>();
    for (const conn of connections) {
      const list = reverse.get(conn.toNodeId) ?? [];
      list.push(conn.fromNodeId);
      reverse.set(conn.toNodeId, list);
    }

    const visited = new Set<string>();
    const variables: string[] = [];
    const stack: string[] = (reverse.get(nodeId) ?? []).slice();
    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      const current = nodeMap.get(currentId);
      if (!current) continue;
      variables.push(`${current.label}.output`);
      // Expose declared variables for variable_set nodes.
      if (String(current.type) === 'variable_set' || String(current.type) === 'variable_get') {
        const varName = current.config['name'] as string | undefined;
        if (varName) variables.push(varName);
      }
      for (const parent of reverse.get(currentId) ?? []) {
        if (!visited.has(parent)) stack.push(parent);
      }
    }
    return variables;
  }

  getAutocompleteSuggestions(
    nodeType: string,
    propertyName: string,
    partial: string,
    availableVariables: string[],
  ): string[] {
    const definition = this.getDefinition(nodeType);
    if (!definition) return [];

    const prop = definition.properties.find((p) => p.name === propertyName);
    if (!prop) return [];

    const lower = partial.toLowerCase();
    const suggestions: string[] = [];

    if (prop.type === 'select' && prop.options) {
      suggestions.push(...prop.options.filter((o) => o.toLowerCase().includes(lower)));
    }

    if (this.isReferenceField(prop) || prop.type === 'textarea' || prop.type === 'json') {
      suggestions.push(
        ...availableVariables.filter((v) => v.toLowerCase().includes(lower)),
      );
    }

    // Property-name based hints.
    if (propertyName === 'model') {
      for (const m of ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'claude-3-haiku']) {
        if (m.toLowerCase().includes(lower)) suggestions.push(m);
      }
    }

    // De-duplicate.
    return Array.from(new Set(suggestions));
  }

  updateProperty(node: WorkflowNode, propertyName: string, value: unknown): Record<string, unknown> {
    return { ...node.config, [propertyName]: value };
  }

  // --- helpers --------------------------------------------------------------

  private getDefinition(type: string): NodeDefinition | null {
    if (this.nodeRegistry.isKnownType(type)) {
      return this.nodeRegistry.getDefinition(type as NodeDefinition['type']);
    }
    if (this.connectorLibrary) {
      return this.connectorLibrary.getDefinition(type);
    }
    return null;
  }

  private isReferenceField(prop: NodePropertyDescriptor): boolean {
    return (
      prop.name === 'expression' ||
      prop.name === 'value' ||
      prop.name === 'recipient' ||
      prop.name === 'prompt' ||
      prop.name === 'body' ||
      prop.name === 'message'
    );
  }
}
