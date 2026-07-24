# Webhook Receiver

## Overview

The webhook receiver core validates, deduplicates, parses, and dispatches
GitHub webhook events. It is framework-agnostic — it does not include an HTTP
server. The receiver is designed to be embedded in any HTTP framework adapter.

## Architecture

```
GitHubWebhookReceiver.receive(input)
  ↓
1. Validate payload size
  ↓
2. Validate required headers (x-github-event, x-github-delivery)
  ↓
3. Check for duplicate delivery
  ↓
4. Verify HMAC-SHA256 signature
  ↓
5. Parse JSON payload via GitHubWebhookParser
  ↓
6. Dispatch to registered handler
  ↓
7. Emit telemetry + record delivery
```

## Components

### GitHubWebhookReceiver

Main entry point. Orchestrates the entire receive pipeline.

- Validates payload size (default 10MB max)
- Checks for duplicate deliveries via `IGitHubWebhookDeliveryStore`
- Verifies signature via `GitHubWebhookVerifier`
- Parses payload via `GitHubWebhookParser`
- Dispatches via `GitHubWebhookDispatcher`
- Emits telemetry for received, duplicate, and processed events

### GitHubWebhookHandlerRegistry

Registers handlers by event name. Prevents duplicate handler registration.

```ts
const registry = new GitHubWebhookHandlerRegistry();
registry.register({
  eventName: 'issues',
  handle: async (event, orgId) => { ... }
});
```

### GitHubWebhookDispatcher

Dispatches parsed events to the appropriate handler. Sanitizes event metadata
before emitting telemetry.

### IGitHubWebhookDeliveryStore

Persists delivery records for deduplication. In-memory implementation available.

## Supported Events

| Event | Handler | Action |
|-------|---------|--------|
| `installation` | `createInstallationHandler` | Log installation event |
| `installation_repositories` | `createInstallationRepositoriesHandler` | Log repository changes |
| `repository` | `createRepositoryHandler` | Upsert repository to sync store |
| `issues` | `createIssuesHandler` | Upsert issue to sync store |
| `issue_comment` | `createIssueCommentHandler` | Log comment event |
| `pull_request` | `createPullRequestHandler` | Upsert PR to sync store |
| `push` | `createPushHandler` | Log push event |
| `workflow_run` | `createWorkflowRunHandler` | Upsert workflow run to sync store |
| `workflow_dispatch` | `createWorkflowDispatchHandler` | Log dispatch event |

## Security

- HMAC-SHA256 signature verification with timing-safe comparison
- No secrets in telemetry, audit logs, or error messages
- Delivery records contain only metadata (delivery ID, event name, status)
- `sanitizeMetadata` redacts `x-hub-signature-256` and all secret patterns

## Deduplication

Each delivery is tracked by `(organizationId, deliveryId)`. Duplicate deliveries
are rejected with a `connector.github.webhook.duplicate` telemetry event.

## Usage

```ts
import {
  GitHubWebhookReceiver,
  GitHubWebhookVerifier,
  GitHubWebhookHandlerRegistry,
  GitHubWebhookDispatcher,
  InMemoryGitHubWebhookDeliveryStore,
  GitHubWebhookParser,
  createAllWebhookHandlers,
} from '@compilerai/connectors';

const verifier = new GitHubWebhookVerifier(credentialResolver);
const deliveryStore = new InMemoryGitHubWebhookDeliveryStore();
const handlerRegistry = new GitHubWebhookHandlerRegistry();
const dispatcher = new GitHubWebhookDispatcher(handlerRegistry);
const telemetry = new ConnectorTelemetry();

// Register all 9 event handlers
for (const handler of createAllWebhookHandlers({ repositoryStore, issueStore, ... })) {
  handlerRegistry.register(handler);
}

const receiver = new GitHubWebhookReceiver({
  verifier, parser: GitHubWebhookParser, dispatcher,
  deliveryStore, telemetry, handlerRegistry,
});

// Process a webhook
const result = await receiver.receive({
  organizationId: 'org-1',
  headers: requestHeaders,
  rawPayload: requestBody,
});
```

## Limitations

- No HTTP server included (Sprint 25 scope: core only)
- No HTTP framework adapter
- Delivery store is in-memory only (no persistence)
