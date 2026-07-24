import type { ICopilotCapability, ICopilotConnectorMetadata, ICopilotConnectorRegistry } from './interfaces.js';

export class ConnectorCatalog {
  private readonly registry: ICopilotConnectorRegistry;

  constructor(registry: ICopilotConnectorRegistry) {
    this.registry = registry;
  }

  isConnectorAvailable(id: string): boolean {
    return this.registry.hasProvider(id);
  }

  getConnectorCapabilities(id: string): ICopilotCapability[] {
    if (!this.registry.hasProvider(id)) {
      return [];
    }
    return this.registry.getProvider(id).getCapabilities();
  }

  findCapabilityByName(connectorId: string, capability: string): ICopilotCapability | null {
    const capabilities = this.getConnectorCapabilities(connectorId);
    return capabilities.find((c) => c.name === capability) ?? null;
  }

  listAvailableConnectors(): ICopilotConnectorMetadata[] {
    return this.registry.listProviderMetadata();
  }

  getCapabilityDescription(connectorId: string, capabilityName: string): string {
    const cap = this.findCapabilityByName(connectorId, capabilityName);
    if (!cap) {
      return `Capability '${capabilityName}' not found on connector '${connectorId}'.`;
    }
    return cap.description;
  }

  findConnectorsByCategory(category: string): ICopilotConnectorMetadata[] {
    return this.registry.listProviderMetadata().filter(
      (m) => m.category.toLowerCase() === category.toLowerCase(),
    );
  }

  hasCapability(connectorId: string, capability: string): boolean {
    return this.findCapabilityByName(connectorId, capability) !== null;
  }
}
