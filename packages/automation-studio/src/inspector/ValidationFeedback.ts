import type { WorkflowNode, NodeDefinition } from '../models/WorkflowModels.js';

export type ValidationLevel = 'error' | 'warning' | 'info';
export type ValidationCategory =
  | 'required'
  | 'type'
  | 'format'
  | 'reference'
  | 'connection'
  | 'permission';

export interface ValidationFeedbackItem {
  level: ValidationLevel;
  category: ValidationCategory;
  message: string;
  field?: string;
  suggestion?: string;
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export class ValidationFeedback {
  static validateNodeConfig(
    node: WorkflowNode,
    definition: NodeDefinition,
  ): ValidationFeedbackItem[] {
    const items: ValidationFeedbackItem[] = [];
    const config = node.config ?? {};

    for (const prop of definition.properties) {
      const value = config[prop.name];

      if (prop.required && isBlank(value)) {
        items.push({
          level: 'error',
          category: 'required',
          message: `Missing required property: ${prop.label}`,
          field: prop.name,
          suggestion: `Provide a value for ${prop.label}.`,
        });
        continue;
      }

      if (isBlank(value)) continue;

      // Type checks.
      switch (prop.type) {
        case 'number': {
          if (typeof value !== 'number' || Number.isNaN(value)) {
            items.push({
              level: 'error',
              category: 'type',
              message: `${prop.label} must be a number`,
              field: prop.name,
            });
          } else if (prop.name === 'maxTokens' && value <= 0) {
            items.push({
              level: 'warning',
              category: 'format',
              message: `${prop.label} should be greater than 0`,
              field: prop.name,
            });
          }
          break;
        }
        case 'boolean': {
          if (typeof value !== 'boolean') {
            items.push({
              level: 'error',
              category: 'type',
              message: `${prop.label} must be a boolean`,
              field: prop.name,
            });
          }
          break;
        }
        case 'select': {
          if (prop.options && !prop.options.includes(asString(value))) {
            items.push({
              level: 'error',
              category: 'format',
              message: `${prop.label} must be one of: ${prop.options.join(', ')}`,
              field: prop.name,
            });
          }
          break;
        }
        case 'json': {
          if (typeof value === 'string') {
            try {
              JSON.parse(value);
            } catch {
              items.push({
                level: 'error',
                category: 'format',
                message: `${prop.label} is not valid JSON`,
                field: prop.name,
              });
            }
          } else if (typeof value !== 'object') {
            items.push({
              level: 'warning',
              category: 'type',
              message: `${prop.label} should be a JSON object`,
              field: prop.name,
            });
          }
          break;
        }
        case 'textarea':
        case 'string': {
          if (typeof value !== 'string') {
            items.push({
              level: 'error',
              category: 'type',
              message: `${prop.label} must be a string`,
              field: prop.name,
            });
          }
          break;
        }
        default:
          break;
      }
    }

    return items;
  }

  static validateConnection(
    fromNode: WorkflowNode,
    toNode: WorkflowNode,
    fromPort: string,
    toPort: string,
  ): ValidationFeedbackItem[] {
    const items: ValidationFeedbackItem[] = [];

    if (fromNode.id === toNode.id) {
      items.push({
        level: 'error',
        category: 'connection',
        message: 'A node cannot connect to itself',
        suggestion: 'Remove the self-loop.',
      });
    }

    if (toNode.type === 'trigger') {
      items.push({
        level: 'error',
        category: 'connection',
        message: 'Trigger nodes cannot have incoming connections',
        field: toPort,
      });
    }

    if (fromNode.type === 'end') {
      items.push({
        level: 'error',
        category: 'connection',
        message: 'End nodes cannot have outgoing connections',
        field: fromPort,
      });
    }

    if (fromPort === '' || toPort === '') {
      items.push({
        level: 'error',
        category: 'connection',
        message: 'Connection ports must be specified',
      });
    }

    return items;
  }

  static validateVariableReference(
    reference: string,
    availableVariables: string[],
  ): ValidationFeedbackItem[] {
    const items: ValidationFeedbackItem[] = [];
    if (!reference) return items;

    // Support simple {{var}} or ${var} interpolation patterns.
    const refNames = new Set<string>();
    const regex = /\{\{\s*([\w.]+)\s*\}\}|\$\{\s*([\w.]+)\s*\}/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(reference)) !== null) {
      const name = match[1] ?? match[2];
      if (name) refNames.add(name);
    }
    // Also treat a bare identifier as a reference.
    if (refNames.size === 0 && /^[\w.]+$/.test(reference)) {
      refNames.add(reference);
    }

    const available = new Set(availableVariables);
    for (const name of refNames) {
      if (!available.has(name)) {
        items.push({
          level: 'warning',
          category: 'reference',
          message: `Variable "${name}" is not available at this point in the flow`,
          field: name,
          suggestion: 'Check upstream nodes that produce this variable.',
        });
      }
    }
    return items;
  }

  static formatFeedback(items: ValidationFeedbackItem[]): string[] {
    return items.map((item) => {
      const prefix = item.level === 'error' ? '✖' : item.level === 'warning' ? '⚠' : 'ℹ';
      const field = item.field ? `[${item.field}] ` : '';
      const suggestion = item.suggestion ? ` — ${item.suggestion}` : '';
      return `${prefix} ${field}${item.message}${suggestion}`;
    });
  }
}
