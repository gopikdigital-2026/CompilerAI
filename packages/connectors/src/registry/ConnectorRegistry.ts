import type { Connector, ConnectorProvider, ConnectorId, ConnectorCredentials } from '../types/index';
import { ConnectorAlreadyRegisteredError, ConnectorNotFoundError, ConnectorValidationError } from '../core/ConnectorErrors';

export class ConnectorRegistry {
  private providers = new Map<ConnectorId, ConnectorProvider>();
  private connectors = new Map<string, Connector>();

  registerProvider(provider: ConnectorProvider): void {
    const meta = provider.getMetadata();
    if (this.providers.has(meta.id)) {
      throw new ConnectorAlreadyRegisteredError(
        `Connector provider '${meta.id}' is already registered`,
      );
    }
    this.validateProvider(provider);
    this.providers.set(meta.id, provider);
  }

  unregisterProvider(connectorId: ConnectorId): boolean {
    return this.providers.delete(connectorId);
  }

  getProvider(connectorId: ConnectorId): ConnectorProvider {
    const provider = this.providers.get(connectorId);
    if (!provider) {
      throw new ConnectorNotFoundError(`Connector provider '${connectorId}' is not registered`);
    }
    return provider;
  }

  hasProvider(connectorId: ConnectorId): boolean {
    return this.providers.has(connectorId);
  }

  listProviders(): ConnectorProvider[] {
    return Array.from(this.providers.values());
  }

  listProviderMetadata(): Array<{ id: ConnectorId; displayName: string; category: string; description: string }> {
    return Array.from(this.providers.values()).map((p) => {
      const m = p.getMetadata();
      return { id: m.id, displayName: m.displayName, category: m.category, description: m.description };
    });
  }

  createConnector(
    connectorId: ConnectorId,
    organizationId: string,
    credentials: ConnectorCredentials | null,
    options: Record<string, unknown> = {},
  ): Connector {
    const provider = this.getProvider(connectorId);
    const connector = provider.createConnector({ organizationId, credentials, options });
    const instanceKey = `${connectorId}:${organizationId}`;
    this.connectors.set(instanceKey, connector);
    return connector;
  }

  getConnector(connectorId: ConnectorId, organizationId: string): Connector | null {
    return this.connectors.get(`${connectorId}:${organizationId}`) ?? null;
  }

  listConnectors(): Connector[] {
    return Array.from(this.connectors.values());
  }

  removeConnector(connectorId: ConnectorId, organizationId: string): boolean {
    return this.connectors.delete(`${connectorId}:${organizationId}`);
  }

  clear(): void {
    this.providers.clear();
    this.connectors.clear();
  }

  get count(): number {
    return this.providers.size;
  }

  private validateProvider(provider: ConnectorProvider): void {
    const meta = provider.getMetadata();
    const errors: string[] = [];

    if (!meta.id || meta.id.trim().length === 0) {
      errors.push('Connector metadata id is required');
    }
    if (!meta.displayName || meta.displayName.trim().length === 0) {
      errors.push('Connector metadata displayName is required');
    }
    if (!meta.description || meta.description.trim().length === 0) {
      errors.push('Connector metadata description is required');
    }
    if (!meta.vendor || meta.vendor.trim().length === 0) {
      errors.push('Connector metadata vendor is required');
    }

    const caps = provider.getCapabilities();
    if (caps.length === 0) {
      errors.push('Connector must declare at least one capability');
    }
    for (const cap of caps) {
      if (!cap.name || cap.name.trim().length === 0) {
        errors.push('Each capability must have a name');
      }
    }

    const auth = provider.getAuthRequirements();
    if (!auth.scheme) {
      errors.push('Connector auth requirements must specify a scheme');
    }

    if (errors.length > 0) {
      throw new ConnectorValidationError(
        `Connector provider '${meta.id}' failed validation`,
        errors,
      );
    }
  }
}
