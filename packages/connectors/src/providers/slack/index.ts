import type {
  Connector,
  ConnectorProvider,
  ConnectorMetadata,
  ConnectorCapability,
  ConnectorAuthRequirements,
  ConnectorProviderConfig,
} from '../../types/index';
import { BaseConnector } from '../../core/BaseConnector';

const METADATA: ConnectorMetadata = {
  id: 'slack',
  displayName: 'Slack',
  description: 'Connect to Slack for messaging, channels, and workspace automation',
  category: 'communication',
  icon: 'slack',
  vendor: 'Slack',
  documentationUrl: 'https://api.slack.com/docs',
  version: '1.0.0',
  tags: ['slack', 'messaging', 'channels', 'chat'],
};

const CAPABILITIES: ConnectorCapability[] = [
  {
    name: 'send_message',
    method: 'execute',
    description: 'Send a message to a Slack channel',
    inputSchema: { channel: 'string', text: 'string' },
    outputSchema: { ok: 'boolean', ts: 'string' },
    requiredScopes: ['chat:write'],
  },
  {
    name: 'list_channels',
    method: 'list',
    description: 'List all channels in the workspace',
    inputSchema: {},
    outputSchema: { channels: 'array' },
    requiredScopes: ['channels:read'],
  },
  {
    name: 'list_messages',
    method: 'list',
    description: 'List messages from a channel',
    inputSchema: { channel: 'string', limit: 'number' },
    outputSchema: { messages: 'array' },
    requiredScopes: ['channels:history'],
  },
  {
    name: 'create_channel',
    method: 'create',
    description: 'Create a new Slack channel',
    inputSchema: { name: 'string', isPrivate: 'boolean' },
    outputSchema: { channelId: 'string' },
    requiredScopes: ['channels:manage'],
  },
  {
    name: 'webhook_receive',
    method: 'webhook',
    description: 'Receive incoming webhook events',
    inputSchema: {},
    outputSchema: {},
    requiredScopes: ['incoming-webhook'],
  },
];

const AUTH_REQUIREMENTS: ConnectorAuthRequirements = {
  scheme: 'oauth2',
  requiredFields: ['clientId', 'clientSecret'],
  optionalFields: ['botToken', 'signingSecret'],
  scopes: ['chat:write', 'channels:read', 'channels:history', 'channels:manage', 'incoming-webhook'],
  tokenEndpoint: 'https://slack.com/api/oauth.v2.access',
  authorizationEndpoint: 'https://slack.com/oauth/v2/authorize',
  refreshSupported: false,
};

class SlackConnector extends BaseConnector {
  protected async onInitialize(): Promise<void> {}
  protected async onExecute(_capability: string, _input: Record<string, unknown>): Promise<unknown> {
    return { placeholder: true };
  }
}

export class SlackProvider implements ConnectorProvider {
  readonly providerId = 'slack';

  createConnector(config: ConnectorProviderConfig): Connector {
    void config;
    return new SlackConnector(METADATA, CAPABILITIES, AUTH_REQUIREMENTS);
  }

  getMetadata(): ConnectorMetadata {
    return METADATA;
  }

  getCapabilities(): ConnectorCapability[] {
    return CAPABILITIES;
  }

  getAuthRequirements(): ConnectorAuthRequirements {
    return AUTH_REQUIREMENTS;
  }
}
