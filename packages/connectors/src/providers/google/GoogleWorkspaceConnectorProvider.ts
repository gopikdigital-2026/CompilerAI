import type { ConnectorProvider, ConnectorMetadata, ConnectorCapability, ConnectorAuthRequirements, Connector, ConnectorProviderConfig } from '../../types/index';
import { GoogleWorkspaceConnector, GOOGLE_WORKSPACE_METADATA, GOOGLE_WORKSPACE_CAPABILITIES, GOOGLE_WORKSPACE_AUTH_REQUIREMENTS } from './GoogleWorkspaceConnector';

export class GoogleWorkspaceConnectorProvider implements ConnectorProvider {
  readonly providerId = 'google-workspace';

  getMetadata(): ConnectorMetadata {
    return GOOGLE_WORKSPACE_METADATA;
  }

  getCapabilities(): ConnectorCapability[] {
    return GOOGLE_WORKSPACE_CAPABILITIES;
  }

  getAuthRequirements(): ConnectorAuthRequirements {
    return GOOGLE_WORKSPACE_AUTH_REQUIREMENTS;
  }

  createConnector(_config: ConnectorProviderConfig): Connector {
    return new GoogleWorkspaceConnector(
      GOOGLE_WORKSPACE_METADATA,
      GOOGLE_WORKSPACE_CAPABILITIES,
      GOOGLE_WORKSPACE_AUTH_REQUIREMENTS,
    );
  }
}
