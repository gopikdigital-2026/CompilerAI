# Tool Manifest Specification

Every CompilerAI-compatible tool is described by a `tool.json` manifest file. The manifest is the single source of truth for a tool's identity, capabilities, permissions, and installation metadata.

## Schema

```typescript
interface ToolManifest {
  id: string;                      // Unique identifier, lowercase alphanumeric + hyphens
  name: string;                    // Human-readable name (min 2 chars)
  description: string;             // Description (min 10 chars)
  version: string;                 // Semantic version (e.g. "1.2.0")
  author: string;                  // Author or organization name
  category: ToolCategory;          // Tool classification
  capabilities: string[];          // Functional capabilities offered
  permissions: ToolPermission[];   // Required permissions
  runtimeCompatibility: RuntimeCompatibility[];  // Supported runtimes
  dependencies: ToolDependency[];  // Other tools this depends on
  entrypoint: string;              // Path to tool entry file (not executed during install)
  checksum: string;                // SHA-256 hex checksum (64 hex chars)
  signature: string;               // Cryptographic signature
  verified: boolean;               // Marketplace verification status
}
```

## Fields

### `id`
- Lowercase alphanumeric with hyphens
- Must match `^[a-z0-9][a-z0-9-]*$`
- Globally unique across the marketplace

### `name`
- Human-readable display name
- Minimum 2 characters

### `description`
- Describes what the tool does
- Minimum 10 characters

### `version`
- Must follow [Semantic Versioning](https://semver.org/) format: `MAJOR.MINOR.PATCH`
- Pre-release suffixes allowed: `1.0.0-beta.1`

### `author`
- Individual or organization name
- Non-empty string

### `category`

One of:

| Category | Description |
|---|---|
| `data` | Data processing and enrichment |
| `ai` | AI/ML model integration |
| `integration` | External service connectors |
| `utility` | General-purpose utilities |
| `security` | Security scanning and validation |
| `monitoring` | Observability and metrics |
| `workflow` | Workflow orchestration helpers |
| `communication` | Notification and messaging |

### `capabilities`
- Array of strings describing functional capabilities
- Example: `["context-enrichment", "data-lookup"]`

### `permissions`

Array of required permissions. Available permissions:

| Permission | Risk Level | Description |
|---|---|---|
| `read:memory` | low | Read from memory engine |
| `write:memory` | medium | Write to memory engine |
| `read:executions` | low | Read execution data |
| `write:executions` | high | Modify execution state |
| `read:workflows` | low | Read workflow definitions |
| `write:workflows` | medium | Modify workflow definitions |
| `execute:shell` | **critical** | Execute shell commands |
| `network:external` | **critical** | Make external network calls |
| `file:read` | medium | Read files |
| `file:write` | high | Write files |
| `env:read` | **critical** | Read environment variables |
| `env:write` | **critical** | Write environment variables |
| `org:admin` | **critical** | Organization admin access |

**Blocked by default**: `execute:shell`, `env:write`, `org:admin`

### `runtimeCompatibility`

Array of supported runtimes:

| Runtime | Description |
|---|---|
| `compiler-runtime` | CompilerAI execution runtime |
| `node` | Node.js |
| `browser` | Browser environment |
| `edge` | Edge function runtime |
| `universal` | All runtimes (requires extra review) |

### `dependencies`

Array of tool dependencies:

```typescript
interface ToolDependency {
  toolId: string;        // ID of the required tool
  versionRange: string;  // Semver range (e.g. ">=1.0.0", "*", "1.x")
}
```

Dependencies must be registered in the marketplace and compatible with the same runtime.

### `entrypoint`
- Path to the tool's entry file
- **Not executed during installation** — only recorded as metadata

### `checksum`
- SHA-256 hex string (64 hexadecimal characters)
- Must match `^[a-f0-9]{64}$`

### `signature`
- Cryptographic signature proving authenticity
- Must start with `sig_` prefix followed by the first 16 chars of the checksum

### `verified`
- Boolean indicating marketplace verification
- Unverified tools cannot be installed (signature verification will fail)

## Example

See `examples/sample-tool/tool.json` for a complete example manifest.

## Validation

Manifests are validated by `ToolManifestValidator` before any installation. Validation checks:

1. All required fields present
2. Field types correct
3. `id` format valid
4. `version` is valid semver
5. `category` is a known value
6. All `permissions` are recognized
7. All `runtimeCompatibility` entries are valid
8. `checksum` is a valid 64-char hex string
9. `dependencies` have `toolId` and `versionRange`
10. `verified` is a boolean

Warnings (non-blocking):
- `verified: false` — requires explicit confirmation
- Empty `capabilities` — tool may have no functionality
