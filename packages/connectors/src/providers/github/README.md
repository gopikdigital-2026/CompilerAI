# GitHub Connector

## Status: Beta

The GitHub connector provides integration with the GitHub REST API for repositories, issues, pull requests, and GitHub Actions workflows.

## Features

- **Authentication**: Personal Access Token (PAT) via CredentialStore
- **11 Operations**: Identity, repositories, issues, pull requests, workflow runs
- **Pagination**: Link header parsing with optional async iterator
- **Rate Limits**: GitHub rate limit header interpretation and normalization
- **Error Mapping**: HTTP status codes mapped to `ConnectorRuntimeError` hierarchy
- **Webhooks**: HMAC-SHA256 signature verification and event parsing
- **Security**: Host allowlist, path encoding, payload size limits, secret sanitization

## Usage

### Register with ConnectorRuntime

```typescript
import {
  ConnectorRuntime,
  InMemoryCredentialStore,
  DevelopmentCredentialEncryptionProvider,
  CredentialResolver,
  GitHubApiClient,
  GitHubTokenAuthAdapter,
  registerGitHubOperations,
} from '@compilerai/connectors';

const store = new InMemoryCredentialStore();
const encryption = new DevelopmentCredentialEncryptionProvider('key');
const resolver = new CredentialResolver(store, encryption);

const client = new GitHubApiClient();
const authAdapter = new GitHubTokenAuthAdapter(resolver);

const runtime = new ConnectorRuntime();
registerGitHubOperations(runtime, client, authAdapter);
```

### Store credentials

```typescript
await resolver.storeCredentials('github', 'org-1', 'oauth2', {
  accessToken: 'ghp_xxxxxxxxxxxx',
});
```

### Execute an operation

```typescript
const result = await runtime.execute({
  connectorId: 'github',
  operation: 'github.listRepositories',
  input: { organizationId: 'org-1', perPage: 10 },
  context,
});
```

## Operations

| Operation | Method | Idempotent | Retryable |
|-----------|--------|------------|-----------|
| `github.getAuthenticatedUser` | GET | Yes | Yes |
| `github.listRepositories` | GET | Yes | Yes |
| `github.getRepository` | GET | Yes | Yes |
| `github.listIssues` | GET | Yes | Yes |
| `github.getIssue` | GET | Yes | Yes |
| `github.createIssue` | POST | No | No |
| `github.addIssueComment` | POST | No | No |
| `github.listPullRequests` | GET | Yes | Yes |
| `github.getPullRequest` | GET | Yes | Yes |
| `github.listWorkflowRuns` | GET | Yes | Yes |
| `github.triggerWorkflowDispatch` | POST | No | No |

## GitHub App Authentication

GitHub App authentication (JWT generation + installation token exchange) is documented but **not yet implemented**. Use Personal Access Token authentication in the meantime. See `docs/github/github-enterprise.md` for planned support.

## Limitations

- No GitHub App JWT/installation token support yet
- No automatic pagination (use the async iterator utility)
- Webhook verification only — no HTTP server
- GitHub Enterprise Server requires explicit host configuration
