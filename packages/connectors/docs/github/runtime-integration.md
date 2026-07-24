# Runtime Integration

## Official Execution Path

All GitHub operations must be executed through `ConnectorRuntime`. This ensures
every call passes through the resilience pipeline (retry, timeout, rate limiting,
circuit breaker) and the observability layer (telemetry, metrics, traces, audit).

## Setup

```ts
import {
  ConnectorRuntime,
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  registerGitHubConnector,
  GITHUB_CONNECTOR_ID,
} from '@compilerai/connectors';

// 1. Create credential infrastructure
const store = new InMemoryCredentialStore();
const encryption = new DevelopmentCredentialEncryptionProvider('encryption-key');
const resolver = new CredentialResolver(store, encryption);

// 2. Store credentials
await resolver.storeCredentials(GITHUB_CONNECTOR_ID, 'org-1', 'oauth2', {
  accessToken: 'ghp_xxx',
});

// 3. Create runtime and register connector
const runtime = new ConnectorRuntime();
registerGitHubConnector({ runtime, credentialResolver: resolver });

// 4. Execute operations
const result = await runtime.execute({
  connectorId: GITHUB_CONNECTOR_ID,
  operation: 'github.getAuthenticatedUser',
  input: { organizationId: 'org-1' },
  context: createExecutionContext({ organizationId: 'org-1', userId: 'user-1' }),
});
```

## Injectable Transport

For testing, inject a custom `fetch` implementation:

```ts
registerGitHubConnector({
  runtime,
  credentialResolver: resolver,
  transport: mockFetch,
});
```

## Deprecated Direct Execution

`BaseConnector.execute()` and `GitHubConnector.onExecute()` are deprecated.
They bypass the runtime pipeline and should not be used.
