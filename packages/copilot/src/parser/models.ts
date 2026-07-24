export type ActionType = 'trigger' | 'filter' | 'transform' | 'send' | 'create' | 'update' | 'read' | 'notify';
export type ConditionOperator = 'equals' | 'contains' | 'greater_than' | 'less_than' | 'starts_with' | 'exists' | 'not_exists';
export type VariableType = 'string' | 'number' | 'boolean' | 'date' | 'email' | 'currency' | 'array' | 'object';
export type TriggerType = 'event' | 'schedule' | 'webhook' | 'manual';

export interface ParsedParameter {
  name: string;
  value: string | number | boolean | null;
  type: VariableType;
  isReference: boolean; // true if value is a variable reference like "{{email.subject}}"
}

export interface ParsedAction {
  id: string;
  type: ActionType;
  description: string;
  connectorId: string | null;
  capabilityName: string | null;
  parameters: Record<string, ParsedParameter>;
  dependsOn: string[];
}

export interface ParsedCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: string | number | boolean | null;
  description: string;
}

export interface ParsedVariable {
  name: string;
  type: VariableType;
  description: string;
  source: string | null; // which action produces this variable
}

export interface ParsedTrigger {
  type: TriggerType;
  connectorId: string | null;
  capabilityName: string | null;
  description: string;
  parameters: Record<string, ParsedParameter>;
}

export interface ParsedIntent {
  rawInstruction: string;
  language: 'en' | 'es' | 'fr' | 'de' | 'pt';
  trigger: ParsedTrigger;
  actions: ParsedAction[];
  conditions: ParsedCondition[];
  variables: ParsedVariable[];
  connectorIds: string[];
  confidence: number; // 0-1
  ambiguities: string[];
  parseErrors: string[];
}
