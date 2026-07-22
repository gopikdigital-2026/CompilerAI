# API Versioning

## Current Version

**API Version:** `v1`
**Runtime Version:** `1.0.0`
**Base Path:** `/api/v1`

## Versioning Strategy

### URL-Based Versioning

The API version is embedded in the URL path (`/api/v1/`). This approach provides:

- **Explicit versioning** — clients know which version they're using
- **Cache-friendly** — different versions have different URL paths
- **Simple routing** — the HTTP adapter routes by path prefix

### Backward Compatibility

Within a major version (`v1`), the API maintains backward compatibility:

- New endpoints may be added
- New optional fields may be added to request/response bodies
- New error codes may be added
- Existing endpoints, fields, and error codes are not removed or changed

### Breaking Changes

Breaking changes require a new major version (`v2`). Breaking changes include:

- Removing an endpoint
- Changing a field name or type
- Changing an error code's HTTP status
- Making an optional field required
- Changing authentication or authorization behavior

## Version Information

### GET /api/v1/version

Returns the current API version, runtime version, and build date:

```json
{
  "data": {
    "apiVersion": "v1",
    "runtimeVersion": "1.0.0",
    "buildDate": "2026-07-22"
  },
  "meta": { ... }
}
```

### Meta Field

Every response includes `meta.apiVersion` so clients can verify the version programmatically.

## OpenAPI Specification

The full OpenAPI 3.1 specification is available at:

```
GET /api/v1/openapi
```

Returns the specification as YAML. No authentication required.
