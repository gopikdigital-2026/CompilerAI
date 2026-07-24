# Sprint 24.1 — GitHub Connector Stabilization & Hardening

## Overview

This document describes the stabilization work performed on the GitHub connector
in `packages/connectors/` during Sprint 24.1.

## Goals

- Reproducible installation via `npm ci`
- Unified execution path through `ConnectorRuntime`
- Safe provider registration with no import side effects
- Comprehensive security sanitization
- Full test coverage for pagination, rate limits, webhooks, and non-idempotent operations
- Clean build with `.d.ts` declarations
- Real validation results documented

## Architecture

The official execution path is:

```
Application
  ↓
ConnectorRuntime.execute()
  ↓
Registered GitHub Operation
  ↓
CredentialResolver → GitHubTokenAuthAdapter
  ↓
Resilience Pipeline (retry, timeout, rate limit, circuit breaker)
  ↓
GitHubApiClient
  ↓
Normalized Result
```

### Deprecated APIs

- `BaseConnector.execute()` — marked `@deprecated`. Use `ConnectorRuntime.execute()` instead.
- `GitHubConnector.onExecute()` — marked `@deprecated`. Use registered operations via `ConnectorRuntime`.

### Safe Registration

Use `registerGitHubConnector()` to register all 11 GitHub operations:

```ts
import {
  ConnectorRuntime,
  CredentialResolver,
  registerGitHubConnector,
} from '@compilerai/connectors';

const runtime = new ConnectorRuntime();
registerGitHubConnector({
  runtime,
  credentialResolver,
  // optional: apiClientConfig, transport, telemetry
});
```

This function:
- Has no import side effects
- Detects duplicate operation registration
- Supports isolated runtimes in tests
- Does not use global singletons

## Known Limitations

- GitHub App authentication is not yet implemented (Sprint 25)
- Webhook HTTP receiver is not implemented (Sprint 25)
- No incremental sync functionality (Sprint 25)
