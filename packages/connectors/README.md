# CompilerAI Enterprise Connectors

The single integration point between CompilerAI and external services.

## Overview

The Connectors package provides a unified framework for connecting CompilerAI to third-party services. It defines the contracts, registry, and provider placeholders for 8 enterprise services — without making any real HTTP calls or embedding any secrets.

## Supported Providers

| Provider | ID | Category | Auth Scheme |
|----------|----|----------|-------------|
| Microsoft 365 | `microsoft365` | Productivity | OAuth2 |
| Google Workspace | `google_workspace` | Productivity | OAuth2 |
| Slack | `slack` | Communication | OAuth2 |
| GitHub | `github` | Development | OAuth2 |
| Jira | `jira` | Project Management | OAuth2 |
| Notion | `notion` | Knowledge | Bearer Token |
| Salesforce | `salesforce` | CRM | OAuth2 |
| HubSpot | `hubspot` | CRM | OAuth2 |

## Quick Start

```typescript
import { createDefaultRegistry, makeContext } from '@compilerai/connectors';

// Create a registry with all 8 providers pre-registered
const registry = createDefaultRegistry();

// List available connectors
console.log(registry.listProviderMetadata());

// Create a connector instance for an organization
const connector = registry.createConnector('slack', 'org-123', null);

// Initialize with credentials
const ctx = makeContext('org-123', 'user-456');
await connector.initialize(credentials, ctx);

// Execute a capability
const result = await connector.execute('send_message', {
  channel: '#general',
  text: 'Hello from CompilerAI!',
}, ctx);

// Disconnect
await connector.disconnect();
```

## Creating a Custom Connector

```typescript
import { BaseConnector, ConnectorRegistry } from '@compilerai/connectors';
import type { Connector, ConnectorProvider, ConnectorMetadata, ConnectorCapability, ConnectorAuthRequirements } from '@compilerai/connectors';

class MyConnector extends BaseConnector {
  protected async onInitialize(): Promise<void> {
    // Setup logic
  }
  protected async onExecute(capability: string, input: Record<string, unknown>): Promise<unknown> {
    // Capability execution
    return { result: 'done' };
  }
}

class MyProvider implements ConnectorProvider {
  readonly providerId = 'my_service';
  getMetadata(): ConnectorMetadata { /* ... */ }
  getCapabilities(): ConnectorCapability[] { /* ... */ }
  getAuthRequirements(): ConnectorAuthRequirements { /* ... */ }
  createConnector(): Connector { return new MyConnector(/* ... */); }
}

const registry = new ConnectorRegistry();
registry.registerProvider(new MyProvider());
```

## Design Principles

- **Interfaces only** — No real HTTP calls. Providers expose metadata, capabilities, and auth requirements.
- **No secrets** — No credentials or tokens are embedded in the code.
- **Strict TypeScript** — Zero `any` usage, full type safety.
- **No circular dependencies** — Clean module graph.
- **No external dependencies** — Pure TypeScript, zero runtime deps.

## Validation

```bash
npm run typecheck
npm run lint
npm test
npm run build
```
