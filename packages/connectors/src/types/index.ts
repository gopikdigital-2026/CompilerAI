export type UUID = string;
export type ISOString = string;
export type Metadata = { readonly [key: string]: unknown };

export type ConnectorId = string;

export type ConnectorCategory =
  | 'productivity'
  | 'communication'
  | 'development'
  | 'project_management'
  | 'knowledge'
  | 'crm'
  | 'storage'
  | 'custom';

export type ConnectorStatus =
  | 'registered'
  | 'configured'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'disabled';

export type CapabilityMethod =
  | 'read'
  | 'write'
  | 'create'
  | 'update'
  | 'delete'
  | 'list'
  | 'search'
  | 'execute'
  | 'webhook'
  | 'stream';

export interface ConnectorCapability {
  name: string;
  method: CapabilityMethod;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  requiredScopes: string[];
}

export interface ConnectorMetadata {
  id: ConnectorId;
  displayName: string;
  description: string;
  category: ConnectorCategory;
  icon: string;
  vendor: string;
  documentationUrl: string;
  version: string;
  tags: string[];
}

export interface ConnectorResult {
  success: boolean;
  data: unknown;
  error: ConnectorError | null;
  metadata: {
    connectorId: ConnectorId;
    capability: string;
    durationMs: number;
    requestId: string;
    timestamp: ISOString;
  };
}

export interface ConnectorError {
  code: string;
  message: string;
  category: ConnectorErrorCategory;
  retryable: boolean;
  details: Record<string, unknown> | null;
}

export type ConnectorErrorCategory =
  | 'auth'
  | 'rate_limit'
  | 'network'
  | 'validation'
  | 'not_found'
  | 'permission'
  | 'server'
  | 'timeout'
  | 'unknown';

export interface ConnectorContext {
  organizationId: UUID;
  userId: UUID;
  requestId: string;
  correlationId: string;
  timeout: number;
  metadata: Metadata;
}

export interface ConnectorCredentials {
  connectorId: ConnectorId;
  organizationId: UUID;
  authScheme: AuthScheme;
  createdAt: ISOString;
  updatedAt: ISOString;
  expiresAt: ISOString | null;
}

export type AuthScheme = 'oauth2' | 'api_key' | 'bearer' | 'basic' | 'none';

export interface Connector {
  readonly metadata: ConnectorMetadata;
  readonly capabilities: ConnectorCapability[];
  readonly authRequirements: ConnectorAuthRequirements;
  initialize(credentials: ConnectorCredentials, context: ConnectorContext): Promise<void>;
  isInitialized(): boolean;
  getStatus(): ConnectorStatus;
  execute(capability: string, input: Record<string, unknown>, context: ConnectorContext): Promise<ConnectorResult>;
  disconnect(): Promise<void>;
}

export interface ConnectorAuthRequirements {
  scheme: AuthScheme;
  requiredFields: string[];
  optionalFields: string[];
  scopes: string[];
  tokenEndpoint: string | null;
  authorizationEndpoint: string | null;
  refreshSupported: boolean;
}

export interface ConnectorProvider {
  readonly providerId: string;
  createConnector(config: ConnectorProviderConfig): Connector;
  getMetadata(): ConnectorMetadata;
  getCapabilities(): ConnectorCapability[];
  getAuthRequirements(): ConnectorAuthRequirements;
}

export interface ConnectorProviderConfig {
  organizationId: UUID;
  credentials: ConnectorCredentials | null;
  options: Record<string, unknown>;
}
