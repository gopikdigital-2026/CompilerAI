# Getting Started

## Installation

```bash
npm install @compilerai/sdk-typescript
```

## Requirements

- Node.js 18+ (for built-in `fetch` and `crypto.randomUUID`)
- TypeScript 5.6+ (for `export type *` syntax)
- A CompilerAI Platform API instance running and accessible

## Initialization

```typescript
import { CompilerAI } from '@compilerai/sdk-typescript';

const compiler = new CompilerAI({
  apiKey: 'your-api-key',
  organizationId: 'org_123',
  baseUrl: 'http://localhost:3000',
});
```

### Custom Fetch

If you need a custom fetch implementation (e.g., for older Node.js or a proxy):

```typescript
import { CompilerAI } from '@compilerai/sdk-typescript';

const compiler = new CompilerAI({
  apiKey: 'your-api-key',
  organizationId: 'org_123',
  fetch: customFetchImpl,
});
```

### Custom Timeout and Retries

```typescript
const compiler = new CompilerAI({
  apiKey: 'your-api-key',
  organizationId: 'org_123',
  timeoutMs: 10_000,  // 10 second timeout
  maxRetries: 3,       // retry up to 3 times
  retryDelayMs: 1000,  // wait 1s, 2s, 3s between retries
});
```

## Your First Execution

```typescript
// 1. Create an execution
const execution = await compiler.executions.create({
  workflowId: 'wf_default',
  input: { prompt: 'Analyze sales data and recommend actions' },
  idempotencyKey: 'my-unique-key',
});

console.log(`Execution ${execution.executionId} created with status: ${execution.status}`);

// 2. Poll for completion
async function waitForCompletion(executionId: string) {
  while (true) {
    const result = await compiler.executions.getResult(executionId);
    if (['COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT'].includes(result.status)) {
      return result;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

const finalResult = await waitForCompletion(execution.executionId);
console.log(`Final status: ${finalResult.status}`);
console.log(`Warnings: ${finalResult.warnings}`);
```

## Using AbortSignal for Cancellation

```typescript
const controller = new AbortController();

// Cancel after 5 seconds
setTimeout(() => controller.abort(), 5000);

try {
  const result = await compiler.executions.get('exec_1', { signal: controller.signal });
} catch (e) {
  if (e instanceof TimeoutError) {
    console.log('Request was cancelled');
  }
}
```

## Next Steps

- [Error handling guide](error-handling.md)
- [API gaps documentation](api-gaps.md)
- [Basic example](../examples/basic.ts)
- [Workflow example](../examples/workflow.ts)
- [Human approval example](../examples/human-approval.ts)
