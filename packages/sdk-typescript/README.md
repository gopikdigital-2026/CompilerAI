# @compilerai/sdk-typescript

Official TypeScript SDK for the CompilerAI Platform API.

## Installation

```bash
npm install @compilerai/sdk-typescript
```

## Quick Start

```typescript
import { CompilerAI } from '@compilerai/sdk-typescript';

const compiler = new CompilerAI({
  apiKey: 'your-api-key',
  organizationId: 'org_123',
  baseUrl: 'http://localhost:3000', // optional, defaults to http://localhost:3000
});

// Create an execution
const execution = await compiler.executions.create({
  workflowId: 'wf_default',
  input: { prompt: 'Analyze quarterly revenue and propose actions' },
  idempotencyKey: 'unique-key-001',
});

// Poll for result
const result = await compiler.executions.getResult(execution.executionId);
console.log(result.status); // 'COMPLETED'
```

## Resources

| Resource | Methods | Endpoint Available |
|----------|---------|-------------------|
| `executions` | create, get, getResult, pause, resume, cancel, getEvents, getTrace | Yes |
| `workflows` | create, list, get, validate, createVersion, activateVersion, deactivate | Yes |
| `approvals` | list, get, approve, reject, requestChanges | Yes |
| `telemetry` | getEvents | Yes |
| `memory` | query, write, delete | No (stub) |
| `tools` | list, selectTools | No (stub) |
| `health` | health, ready, version, capabilities | Yes |

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | API key for authentication |
| `organizationId` | `string` | required | Organization ID for multitenant scoping |
| `baseUrl` | `string` | `http://localhost:3000` | Platform API base URL |
| `timeoutMs` | `number` | `30000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `2` | Max retry attempts for retryable errors |
| `retryDelayMs` | `number` | `500` | Base delay between retries (multiplied by attempt) |
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch implementation |

## Error Handling

All errors extend `CompilerAIError` with `code`, `httpStatus`, `retryable`, `details`, and `meta`:

```typescript
import { NotFoundError, RateLimitError, isCompilerAIError } from '@compilerai/sdk-typescript';

try {
  const exec = await compiler.executions.get('missing-id');
} catch (e) {
  if (e instanceof NotFoundError) {
    console.log('Execution not found');
  } else if (isCompilerAIError(e)) {
    console.log(`${e.code}: ${e.message} (HTTP ${e.httpStatus})`);
  }
}
```

See [docs/error-handling.md](docs/error-handling.md) for the full error catalog.

## Security

- API keys are never logged or included in error messages
- Headers are sanitized in `getSanitizedHeaders()`
- No secrets appear in error messages
- `organizationId` is validated on client construction
- Non-idempotent operations without an idempotency key are rejected client-side

## Features

- Full TypeScript types with strict mode (no `any`)
- Fetch-based — works in Node.js 18+ and modern browsers
- Timeout via `AbortController`
- Cancellation via `AbortSignal`
- Automatic retries for 429 and 5xx errors (configurable)
- Idempotency key support
- Request ID and correlation ID on every request
- Response validation and JSON parsing
- 9 normalized error classes

## License

MIT
