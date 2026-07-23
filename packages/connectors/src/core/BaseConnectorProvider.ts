import type { Connector, ConnectorMetadata } from '../types/index';

export abstract class BaseConnectorProvider {
  abstract readonly providerId: string;
  abstract createConnector(config: { organizationId: string; credentials: unknown | null; options: Record<string, unknown> }): Connector;
  abstract getMetadata(): ConnectorMetadata;
}
