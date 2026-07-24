# GitHub Connector — GitHub Enterprise Support

## Overview

The GitHub connector is designed to work with both GitHub.com and GitHub Enterprise Server (GHES) instances.

## Configuration

### GitHub.com (default)

No special configuration is needed. The connector defaults to `https://api.github.com`.

### GitHub Enterprise Server

For GHES instances, pass a custom base URL when creating the `GitHubApiClient`:

```typescript
const client = new GitHubApiClient({
  baseUrl: 'https://github.mycompany.com/api/v3',
});
```

The host allowlist includes `github.com` and `api.github.com` by default. For Enterprise instances with custom hostnames, the `ALLOWED_HOSTS` set can be extended:

```typescript
ALLOWED_HOSTS.add('github.mycompany.com');
```

## API Version

All requests include the `X-GitHub-Api-Version: 2022-11-28` header, which is compatible with both GitHub.com and recent GHES versions.

## Authentication

PAT authentication works identically for both GitHub.com and GHES. GitHub App authentication (future) will also support both targets.

## Webhooks

Webhook verification works identically for both environments. The webhook secret is configured per organization in the credential store.

## Rate Limits

GitHub.com enforces a 5000 request/hour limit for authenticated requests. GHES instances may have different limits configured by the appliance administrator. The connector respects the `x-ratelimit-*` headers regardless of the actual limit values.

## Differences from GitHub.com

| Feature | GitHub.com | GHES |
|---------|-----------|------|
| Base URL | `api.github.com` | `github.company.com/api/v3` |
| Rate limit | 5000/hour | Configurable |
| API version header | Required | Required |
| SSL | Enforced | Configurable |
| Webhook delivery | GitHub-managed | Self-hosted |
