# GitHub Connector — Architecture

## Overview

The GitHub connector provides a typed, secure integration between the Compiler platform and the GitHub REST API (v3). It reuses the Sprint 23 runtime infrastructure (execution pipeline, resilience, credentials, observability) and adds GitHub-specific concerns: PAT authentication, HTTP transport, error mapping, rate limit tracking, pagination, and webhook verification.

## Module Layout

```
src/providers/github/
├── index.ts                          # Barrel exports
├── GitHubConnector.ts                # Connector implementation (BaseConnector)
├── GitHubConnectorProvider.ts        # Provider factory (ConnectorProvider)
├── GitHubApiClient.ts                # HTTP transport (configurable fetch)
├── GitHubRequestBuilder.ts           # Fluent URL builder with security checks
├── GitHubErrorMapper.ts              # HTTP status → ConnectorRuntimeError mapping
├── GitHubRateLimitMapper.ts          # x-ratelimit-* header extraction
├── GitHubResponseMapper.ts           # snake_case → camelCase model mapping
├── GitHubPagination.ts               # Link header parsing, async iteration
├── GitHubOperationsFactory.ts        # Operation registration helper
├── auth/
│   ├── GitHubTokenAuthAdapter.ts     # PAT credential resolution
│   └── GitHubAppAuthContracts.ts     # GitHub App auth interfaces (future)
├── operations/
│   ├── GetAuthenticatedUserOperation.ts
│   ├── ListRepositoriesOperation.ts
│   ├── GetRepositoryOperation.ts
│   ├── ListIssuesOperation.ts
│   ├── GetIssueOperation.ts
│   ├── CreateIssueOperation.ts
│   ├── AddIssueCommentOperation.ts
│   ├── ListPullRequestsOperation.ts
│   ├── GetPullRequestOperation.ts
│   ├── ListWorkflowRunsOperation.ts
│   └── TriggerWorkflowDispatchOperation.ts
├── types/
│   ├── GitHubUser.ts
│   ├── GitHubRepository.ts
│   ├── GitHubIssue.ts
│   ├── GitHubPullRequest.ts
│   ├── GitHubWorkflowRun.ts
│   ├── GitHubPaginationResult.ts
│   └── GitHubWebhookEvent.ts
└── webhooks/
    ├── GitHubWebhookVerifier.ts      # HMAC-SHA256 verification
    ├── GitHubWebhookParser.ts        # Header + payload parsing
    └── GitHubWebhookEventMapper.ts   # Event normalization
```

## Data Flow

```
Caller
  └─ ConnectorRuntime.execute()
       └─ ConnectorExecutionPipeline (11 stages)
            └─ ConnectorOperationExecutor
                 └─ GitHub Operation (e.g. GetIssueOperation)
                      ├─ GitHubTokenAuthAdapter.getToken()
                      │    └─ CredentialResolver.resolve()
                      │         └─ ICredentialStore.get()
                      │              └─ ICredentialEncryptionProvider.decrypt()
                      ├─ GitHubApiClient.get() / post()
                      │    └─ GitHubRequestBuilder.build()
                      │         └─ fetch() — actual HTTP call
                      └─ GitHubResponseMapper.map*()
                           └─ Returns normalized camelCase models
```

## Design Principles

1. **Runtime reuse**: All resilience (rate limiting, circuit breaker, timeout, retry), observability (telemetry, metrics, trace, audit), and credential management come from the Sprint 23 runtime. The GitHub connector only provides operations and API-specific logic.

2. **Injectable transport**: `GitHubApiClient` accepts a `FetchLike` function in its constructor, enabling test-time mock injection without network calls.

3. **Security by default**: Host allowlist prevents SSRF, path traversal detection prevents directory attacks, token sanitization prevents secret leakage in errors and telemetry.

4. **Normalized models**: All GitHub API responses (snake_case) are mapped to camelCase TypeScript interfaces before returning to callers.

5. **Non-idempotent operations**: `createIssue`, `addIssueComment`, and `triggerWorkflowDispatch` are marked `retryable: false` to prevent duplicate side effects.
