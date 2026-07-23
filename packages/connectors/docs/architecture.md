# Architecture

## Design Goals

1. **Single integration point** — All external service connections flow through this package.
2. **Interface-driven** — Every contract is a TypeScript interface. No real API calls are made.
3. **No secrets in code** — Credentials are passed at runtime, never embedded.
4. **Zero external dependencies** — The package has no runtime dependencies.
5. **Strict type safety** — TypeScript strict mode with zero `any` usage.

## Module Structure

```
src/
├── types/index.ts          # All core interfaces and type definitions
├── core/
│   ├── BaseConnector.ts    # Abstract base class implementing Connector interface
│   ├── BaseConnectorProvider.ts  # Abstract base for providers
│   └── ConnectorErrors.ts  # Typed error hierarchy
├── registry/
│   └── ConnectorRegistry.ts  # Central registry for providers and connectors
├── auth/index.ts           # OAuth2, API Key, Bearer, Refresh Token interfaces
├── providers/
│   ├── microsoft365/       # Microsoft 365 provider placeholder
│   ├── google/             # Google Workspace provider placeholder
│   ├── slack/              # Slack provider placeholder
│   ├── github/             # GitHub provider placeholder
│   ├── jira/               # Jira provider placeholder
│   ├── notion/             # Notion provider placeholder
│   ├── salesforce/         # Salesforce provider placeholder
│   ├── hubspot/            # HubSpot provider placeholder
│   └── index.ts            # Barrel exports + createDefaultRegistry
├── utils/index.ts          # Helper functions (IDs, masking, parsing)
└── index.ts                # Public API surface
```

## Core Interfaces

### Connector
The runtime instance that executes capabilities against an external service. Lifecycle: `register → initialize → execute → disconnect`.

### ConnectorProvider
Factory that creates connector instances and exposes static metadata, capabilities, and auth requirements. Registered once in the registry.

### ConnectorRegistry
Central store for providers. Validates providers on registration, prevents duplicates, and creates per-organization connector instances.

## Data Flow

```
Application
    ↓
ConnectorRegistry.createConnector(id, orgId, credentials)
    ↓
ConnectorProvider.createConnector(config)
    ↓
Connector.initialize(credentials, context)
    ↓
Connector.execute(capability, input, context)
    ↓
ConnectorResult { success, data, error, metadata }
```

## Dependency Graph

The module graph is strictly acyclic:

```
types ← core ← registry
types ← core ← providers
types ← auth
types ← utils
registry ← providers/index
```

No module imports from a higher-level module. `index.ts` is the only file that imports from all modules.

## Error Model

All errors extend `ConnectorError` with a `code` field:

| Error | Code |
|-------|------|
| ConnectorAlreadyRegisteredError | CONNECTOR_ALREADY_REGISTERED |
| ConnectorNotFoundError | CONNECTOR_NOT_FOUND |
| ConnectorValidationError | CONNECTOR_VALIDATION_FAILED |
| ConnectorAuthenticationError | CONNECTOR_AUTH_FAILED |
| ConnectorCapabilityError | CONNECTOR_CAPABILITY_NOT_SUPPORTED |

Runtime errors from `Connector.execute()` return a `ConnectorResult` with `success: false` and a `ConnectorError` object — they do not throw.
