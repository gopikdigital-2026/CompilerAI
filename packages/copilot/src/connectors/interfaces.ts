export interface ICopilotCapability {
  name: string;
  method: string;
  description: string;
  requiredScopes: string[];
}

export interface ICopilotConnectorMetadata {
  id: string;
  displayName: string;
  description: string;
  category: string;
  tags: string[];
}

export interface ICopilotConnectorProvider {
  getMetadata(): ICopilotConnectorMetadata;
  getCapabilities(): ICopilotCapability[];
}

export interface ICopilotConnectorRegistry {
  hasProvider(id: string): boolean;
  getProvider(id: string): ICopilotConnectorProvider;
  listProviders(): ICopilotConnectorProvider[];
  listProviderMetadata(): ICopilotConnectorMetadata[];
}
