# Authentication

## Overview

The Compiler Platform API supports two authentication methods:

1. **API Key** — via `X-API-Key` header
2. **JWT Bearer Token** — via `Authorization: Bearer <token>` header

API keys are checked first. If an API key is present in either `X-API-Key` or `Authorization` (without the `Bearer ` prefix), the API key validator is used. If a `Bearer` token is present, the JWT validator is used.

## Public Endpoints

The following endpoints do not require authentication:

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Service health check |
| GET | `/api/v1/ready` | Readiness probe |
| GET | `/api/v1/version` | API version info |
| GET | `/api/v1/openapi` | OpenAPI 3.1 specification |

## API Key Authentication

```bash
curl -H "X-API-Key: key-admin" https://api.compiler.ai/api/v1/executions
```

API keys are associated with an organization and a set of roles. The simulated validator stores keys in memory and maps them to `{ actorId, organizationId, roles }`.

## JWT Authentication

```bash
curl -H "Authorization: Bearer jwt-admin" https://api.compiler.ai/api/v1/executions
```

JWT tokens follow the same mapping as API keys. The simulated validator stores tokens in memory.

## Authenticated Principal

Both methods produce an `AuthenticatedPrincipal`:

```typescript
interface AuthenticatedPrincipal {
  actorId:        string;    // user or service ID
  organizationId: string;    // tenant scope
  roles:          string[];  // role names
  permissions:    string[];  // derived from roles
  authMethod:     'API_KEY' | 'JWT' | 'OAUTH2' | 'SERVICE_ACCOUNT';
}
```

## Error Responses

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Missing auth header | 401 | `AUTHENTICATION_REQUIRED` |
| Invalid API key | 401 | `AUTHENTICATION_REQUIRED` |
| Invalid JWT token | 401 | `AUTHENTICATION_REQUIRED` |
| Expired token | 401 | `AUTHENTICATION_REQUIRED` |

All 401 responses include `retryable: false`.
