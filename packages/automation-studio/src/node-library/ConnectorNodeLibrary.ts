import type {
  NodeDefinition,
  NodePort,
  NodePropertyDescriptor,
} from '../models/WorkflowModels.js';
import { NodeRegistry } from '../designer/NodeRegistry.js';

export interface ConnectorNodeDescriptor {
  connectorId: string;
  displayName: string;
  capabilities: Array<{ name: string; description: string; method: string }>;
}

export interface IConnectorNodeSource {
  getConnectors(): ConnectorNodeDescriptor[];
  getConnector(id: string): ConnectorNodeDescriptor | null;
  getCapabilities(connectorId: string): Array<{ name: string; description: string; method: string }>;
  hasConnector(id: string): boolean;
}

/**
 * A node definition that allows string-based types (for connector nodes
 * that extend beyond the fixed `NodeType` union).
 */
export interface ConnectorNodeDefinition {
  type: string;
  category: 'trigger' | 'action' | 'logic' | 'human' | 'terminal';
  label: string;
  icon: string;
  description: string;
  inputs: NodePort[];
  outputs: NodePort[];
  properties: NodePropertyDescriptor[];
  maxInputs: number;
  maxOutputs: number;
  allowMultipleOutputs: boolean;
  connectorId?: string;
}

const STANDARD_INPUT: NodePort = {
  name: 'in',
  label: 'Input',
  type: 'input',
  dataType: 'any',
  required: true,
};
const STANDARD_OUTPUT: NodePort = {
  name: 'out',
  label: 'Output',
  type: 'output',
  dataType: 'any',
  required: true,
};

function def(
  type: string,
  category: ConnectorNodeDefinition['category'],
  label: string,
  icon: string,
  description: string,
  properties: NodePropertyDescriptor[],
  opts: {
    inputs?: NodePort[];
    outputs?: NodePort[];
    maxInputs?: number;
    maxOutputs?: number;
    allowMultipleOutputs?: boolean;
    connectorId?: string;
  } = {},
): ConnectorNodeDefinition {
  return {
    type,
    category,
    label,
    icon,
    description,
    inputs: opts.inputs ?? [STANDARD_INPUT],
    outputs: opts.outputs ?? [STANDARD_OUTPUT],
    properties,
    maxInputs: opts.maxInputs ?? 1,
    maxOutputs: opts.maxOutputs ?? 1,
    allowMultipleOutputs: opts.allowMultipleOutputs ?? false,
    connectorId: opts.connectorId,
  };
}

const str = (
  name: string,
  label: string,
  required: boolean,
  description?: string,
  defaultValue: unknown = '',
): NodePropertyDescriptor => ({
  name,
  label,
  type: 'string',
  required,
  defaultValue,
  description,
});

const textarea = (
  name: string,
  label: string,
  required: boolean,
  description?: string,
): NodePropertyDescriptor => ({
  name,
  label,
  type: 'textarea',
  required,
  defaultValue: '',
  description,
});

const json = (
  name: string,
  label: string,
  required: boolean,
  description?: string,
): NodePropertyDescriptor => ({
  name,
  label,
  type: 'json',
  required,
  defaultValue: {},
  description,
});

const num = (
  name: string,
  label: string,
  required: boolean,
  description?: string,
  defaultValue: unknown = 0,
): NodePropertyDescriptor => ({
  name,
  label,
  type: 'number',
  required,
  defaultValue,
  description,
});

const select = (
  name: string,
  label: string,
  required: boolean,
  options: string[],
  description?: string,
): NodePropertyDescriptor => ({
  name,
  label,
  type: 'select',
  required,
  defaultValue: options[0] ?? '',
  options,
  description,
});

// Built-in connector node definitions.
const CONNECTOR_DEFS: ConnectorNodeDefinition[] = [
  // --- Gmail ---
  def('gmail_trigger', 'trigger', 'Gmail Trigger', 'mail',
    'Triggers when an email is received in Gmail',
    [str('query', 'Search Query', false, 'Gmail search query', 'is:unread'), str('labelIds', 'Label IDs', false, 'Comma-separated label IDs')],
    { inputs: [], maxInputs: 0, connectorId: 'gmail' }),
  def('gmail_send', 'action', 'Send Email (Gmail)', 'mail',
    'Sends an email via Gmail',
    [str('to', 'To', true, 'Recipient email'), str('subject', 'Subject', true), textarea('body', 'Body', true)],
    { connectorId: 'gmail' }),

  // --- Google Drive ---
  def('drive_upload', 'action', 'Upload to Drive', 'folder',
    'Uploads a file to Google Drive',
    [str('fileName', 'File Name', true), str('folderId', 'Folder ID', false), str('content', 'Content', false)],
    { connectorId: 'google-drive' }),
  def('drive_list', 'action', 'List Drive Files', 'folder',
    'Lists files from a Google Drive folder',
    [str('folderId', 'Folder ID', false), select('orderBy', 'Order By', false, ['name', 'modifiedTime', 'createdTime'])],
    { connectorId: 'google-drive' }),

  // --- Google Calendar ---
  def('calendar_create', 'action', 'Create Calendar Event', 'calendar',
    'Creates an event in Google Calendar',
    [str('summary', 'Summary', true), str('start', 'Start Time', true, 'ISO 8601'), str('end', 'End Time', true, 'ISO 8601'), textarea('description', 'Description', false)],
    { connectorId: 'google-calendar' }),
  def('calendar_list', 'action', 'List Calendar Events', 'calendar',
    'Lists events from Google Calendar',
    [str('calendarId', 'Calendar ID', false, 'primary', 'primary'), str('timeMin', 'Time Min', false), str('timeMax', 'Time Max', false)],
    { connectorId: 'google-calendar' }),

  // --- GitHub ---
  def('github_create_issue', 'action', 'Create GitHub Issue', 'github',
    'Creates an issue in a GitHub repository',
    [str('repository', 'Repository', true, 'owner/repo'), str('title', 'Title', true), textarea('body', 'Body', false), str('labels', 'Labels', false, 'Comma-separated labels')],
    { connectorId: 'github' }),
  def('github_list_issues', 'action', 'List GitHub Issues', 'github',
    'Lists issues from a GitHub repository',
    [str('repository', 'Repository', true, 'owner/repo'), select('state', 'State', false, ['open', 'closed', 'all'])],
    { connectorId: 'github' }),

  // --- HTTP / Webhooks ---
  def('http_request', 'action', 'HTTP Request', 'globe',
    'Performs an HTTP request',
    [select('method', 'Method', true, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']), str('url', 'URL', true), json('headers', 'Headers', false), json('body', 'Body', false)],
    { connectorId: 'http' }),
  def('webhook_trigger', 'trigger', 'Webhook Trigger', 'webhook',
    'Triggers when an incoming webhook is received',
    [str('path', 'Path', false, '/webhook'), select('method', 'Method', false, ['POST', 'GET'])],
    { inputs: [], maxInputs: 0, connectorId: 'webhook' }),

  // --- AI ---
  def('ai_prompt', 'action', 'AI Prompt', 'brain',
    'Runs a prompt against an AI model',
    [str('model', 'Model', false, 'Model identifier', 'gpt-4o'), textarea('prompt', 'Prompt', true), num('maxTokens', 'Max Tokens', false, undefined, 4096), num('temperature', 'Temperature', false, undefined, 0.7)],
    { connectorId: 'ai' }),

  // --- Variables ---
  def('variable_set', 'action', 'Set Variable', 'variable',
    'Sets a workflow variable',
    [str('name', 'Variable Name', true), str('value', 'Value', true)],
    { connectorId: 'variables' }),
  def('variable_get', 'action', 'Get Variable', 'variable',
    'Retrieves a workflow variable',
    [str('name', 'Variable Name', true)],
    { connectorId: 'variables' }),

  // --- Retry / Wait ---
  def('retry', 'logic', 'Retry', 'refresh-cw',
    'Retries the upstream branch on failure',
    [num('maxAttempts', 'Max Attempts', true, undefined, 3), num('delayMs', 'Delay (ms)', false, undefined, 1000)],
    { connectorId: 'retry' }),
  def('wait', 'logic', 'Wait', 'clock',
    'Waits for a specified duration before continuing',
    [select('unit', 'Unit', false, ['ms', 'seconds', 'minutes', 'hours', 'days']), num('duration', 'Duration', true, undefined, 1), num('durationMs', 'Duration (ms)', false, 'Explicit milliseconds', 1000)],
    { connectorId: 'wait' }),
];

export class ConnectorNodeLibrary {
  private readonly nodeRegistry: NodeRegistry;
  private readonly connectorSource: IConnectorNodeSource | null;
  private readonly connectorDefs: Map<string, ConnectorNodeDefinition>;

  constructor(source: IConnectorNodeSource | null = null) {
    this.nodeRegistry = new NodeRegistry();
    this.connectorSource = source;
    this.connectorDefs = new Map(CONNECTOR_DEFS.map((d) => [d.type, d]));
  }

  getAllNodeDefinitions(): NodeDefinition[] {
    const base = this.nodeRegistry.getAllDefinitions();
    const connectorNodes: NodeDefinition[] = Array.from(this.connectorDefs.values()).map((d) => ({
      type: d.type as unknown as NodeDefinition['type'],
      category: d.category,
      label: d.label,
      icon: d.icon,
      description: d.description,
      inputs: d.inputs,
      outputs: d.outputs,
      properties: d.properties,
      maxInputs: d.maxInputs,
      maxOutputs: d.maxOutputs,
      allowMultipleOutputs: d.allowMultipleOutputs,
    }));
    return [...base, ...connectorNodes];
  }

  getConnectorNodes(connectorId: string): NodeDefinition[] {
    return Array.from(this.connectorDefs.values())
      .filter((d) => d.connectorId === connectorId)
      .map((d) => ({
        type: d.type as unknown as NodeDefinition['type'],
        category: d.category,
        label: d.label,
        icon: d.icon,
        description: d.description,
        inputs: d.inputs,
        outputs: d.outputs,
        properties: d.properties,
        maxInputs: d.maxInputs,
        maxOutputs: d.maxOutputs,
        allowMultipleOutputs: d.allowMultipleOutputs,
      }));
  }

  getBaseNodes(): NodeDefinition[] {
    return this.nodeRegistry.getAllDefinitions();
  }

  search(query: string): NodeDefinition[] {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAllNodeDefinitions();
    return this.getAllNodeDefinitions().filter(
      (d) =>
        d.label.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q),
    );
  }

  getByCategory(category: string): NodeDefinition[] {
    return this.getAllNodeDefinitions().filter((d) => d.category === category);
  }

  getDefinition(type: string): NodeDefinition | null {
    if (this.nodeRegistry.isKnownType(type)) {
      return this.nodeRegistry.getDefinition(type as NodeDefinition['type']);
    }
    const d = this.connectorDefs.get(type);
    if (!d) return null;
    return {
      type: d.type as unknown as NodeDefinition['type'],
      category: d.category,
      label: d.label,
      icon: d.icon,
      description: d.description,
      inputs: d.inputs,
      outputs: d.outputs,
      properties: d.properties,
      maxInputs: d.maxInputs,
      maxOutputs: d.maxOutputs,
      allowMultipleOutputs: d.allowMultipleOutputs,
    };
  }

  hasNodeType(type: string): boolean {
    return this.nodeRegistry.isKnownType(type) || this.connectorDefs.has(type);
  }

  getAvailableConnectors(): ConnectorNodeDescriptor[] {
    const staticIds = Array.from(new Set(Array.from(this.connectorDefs.values()).map((d) => d.connectorId).filter((c): c is string => c !== undefined)));
    const staticDescriptors: ConnectorNodeDescriptor[] = staticIds.map((id) => ({
      connectorId: id,
      displayName: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      capabilities: [],
    }));
    if (this.connectorSource) {
      return [...this.connectorSource.getConnectors(), ...staticDescriptors];
    }
    return staticDescriptors;
  }

  generateConnectorNodes(connectorId: string): NodeDefinition[] {
    const fromDefs = this.getConnectorNodes(connectorId);
    if (!this.connectorSource || !this.connectorSource.hasConnector(connectorId)) {
      return fromDefs;
    }
    const caps = this.connectorSource.getCapabilities(connectorId);
    const generated: NodeDefinition[] = caps.map((cap) => ({
      type: `${connectorId}_${cap.name}` as unknown as NodeDefinition['type'],
      category: 'action',
      label: cap.name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      icon: 'plug',
      description: cap.description,
      inputs: [STANDARD_INPUT],
      outputs: [STANDARD_OUTPUT],
      properties: [json('parameters', 'Parameters', false)],
      maxInputs: 1,
      maxOutputs: 1,
      allowMultipleOutputs: false,
    }));
    return [...fromDefs, ...generated];
  }
}
