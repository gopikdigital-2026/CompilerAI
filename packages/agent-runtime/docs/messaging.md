# Messaging

## Overview

The `AgentCommunicationBus` provides an in-memory message bus for inter-agent communication. No real sockets are used — all communication is via in-memory adapters.

## Interface

```typescript
interface IAgentCommunicationBus {
  readonly id: string;
  publish(message: Omit<AgentMessage, 'id' | 'timestamp' | 'sanitized'>): AgentMessage;
  subscribe(handler: MessageHandler): () => void;
  subscribeToKind(kind: MessageKind, handler: MessageHandler): () => void;
  getMessages(executionId?: string): AgentMessage[];
  getMessagesByKind(kind: MessageKind, executionId?: string): AgentMessage[];
  clear(): void;
}
```

## Message Types

| Kind | Description |
|---|---|
| `task_request` | Coordinator sends a task to an agent |
| `task_response` | Agent reports task completion |
| `error` | Agent or coordinator reports an error |
| `cancellation` | Execution or task has been cancelled |
| `heartbeat` | Periodic health check signal |
| `event` | General-purpose event notification |

## Subscription Models

### Global Subscription

Receives all messages:

```typescript
const unsubscribe = commBus.subscribe((message) => {
  console.log(message.kind, message.payload);
});
// Later: unsubscribe();
```

### Kind-Specific Subscription

Receives only messages of a specific kind:

```typescript
const unsub = commBus.subscribeToKind('error', (msg) => {
  console.error('Agent error:', msg.payload);
});
```

Both subscription methods return an unsubscribe function.

## Message Sanitization

All published messages are sanitized before storage and delivery:

1. **Sensitive keys** matching `api_key`, `token`, `secret`, `password`, `bearer`, `authorization`, `credential` are replaced with `[REDACTED]`
2. **Secret patterns** in string values are redacted:
   - `sk-*` API key patterns
   - `Bearer *` token patterns
3. Nested objects are recursively sanitized
4. The `sanitized: true` flag is set on every published message

```typescript
// Before: { apiKey: 'sk-secret', data: 'Bearer xyz' }
// After:  { apiKey: '[REDACTED]', data: '[REDACTED]' }
```

## Handler Safety

Handler errors are caught and silently ignored — a faulty handler cannot break the bus or affect other subscribers.

## Querying

- `getMessages(executionId?)` — all messages, optionally filtered by execution
- `getMessagesByKind(kind, executionId?)` — messages of a specific kind

## Usage During Execution

The coordinator publishes messages at each stage:
- `task_request` when dispatching a task
- `task_response` when a task completes
- `error` when a task fails or times out
- `cancellation` when an execution is cancelled
- `heartbeat` after each batch of tasks completes
