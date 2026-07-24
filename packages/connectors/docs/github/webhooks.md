# GitHub Connector — Webhooks

## Overview

The GitHub connector provides webhook verification and parsing for incoming GitHub webhook deliveries. This enables the platform to securely receive and process GitHub events.

## Signature Verification

GitHub sends webhook payloads with an `x-hub-signature-256` header containing an HMAC-SHA256 signature of the payload, prefixed with `sha256=`.

### `GitHubWebhookVerifier`

- **`verifySync(payload, signature, secret)`** — Synchronous verification with a direct secret
- **`verify(payload, signature, organizationId)`** — Async verification that resolves the secret from `CredentialResolver`

Both methods:
1. Recompute the HMAC-SHA256 of the payload using the webhook secret
2. Compare using `timingSafeEqual` to prevent timing attacks
3. Return `{ verified: boolean, reason?: string }`

**Rejection cases:**

| Condition | Reason |
|-----------|--------|
| Missing signature header | `Missing x-hub-signature-256 header` |
| No `sha256=` prefix | `Invalid signature header format` |
| Signature mismatch | `Signature mismatch` |

## Payload Parsing

### `GitHubWebhookParser.parse(headers, rawPayload)`

Extracts:
- `eventName` from `x-github-event` header
- `deliveryId` from `x-github-delivery` header
- `payload` — parsed JSON object
- `receivedAt` — ISO timestamp

Throws on missing headers or invalid JSON.

### `GitHubWebhookParser.isSupported(eventName)`

Checks if an event is in the `SUPPORTED_WEBHOOK_EVENTS` set.

## Event Mapping

### `GitHubWebhookEventMapper.mapEvent(eventName, deliveryId, payload)`

Normalizes the parsed payload into a `GitHubWebhookEvent<TPayload>`:

```typescript
{
  eventName: string,
  deliveryId: string,
  action?: string,
  payload: TPayload,
  repository?: { fullName: string },
  sender?: { login: string },
  receivedAt: string,
}
```

Throws `Unsupported webhook event` for events not in `SUPPORTED_WEBHOOK_EVENTS`.

## Supported Events

The following GitHub webhook events are recognized:

- `push`
- `pull_request`
- `issues`
- `issue_comment`
- `create`
- `delete`
- `fork`
- `star`
- `watch`
- `release`
- `deployment`
- `deployment_status`
- `workflow_run`
- `workflow_job`
- `check_run`
- `check_suite`
- `label`
- `milestone`
- `repository`

## Security Considerations

- Always verify the signature before processing the payload
- Use `verify()` (async) in production to resolve secrets from the credential store
- Never log raw webhook payloads — they may contain sensitive information
- The webhook secret is stored as an optional credential alongside the PAT
