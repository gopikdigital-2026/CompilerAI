# Audit

The Audit module is an append-only log of security-relevant events. Every authentication,
authorization denial, secret access, and explicit `writeAuditLog` call produces an
`AuditEvent` that can be queried, counted, and exported.

## Audit actions

`@compilerai/security-governance` records 12 audit actions via the `AuditAction` type:

| Action | Description |
|--------|-------------|
| `login` | Authentication attempt (success or failure) |
| `logout` | Session termination |
| `skill_install` | A skill was installed from the marketplace |
| `agent_execute` | An AI agent executed an action |
| `kg_access` | Knowledge Graph access |
| `rag_query` | Enterprise RAG query |
| `permission_change` | A role or permission assignment changed |
| `policy_change` | A policy rule was added, removed, or modified |
| `auth_denied` | An authorization request was denied |
| `secret_access` | A secret was stored or retrieved |
| `data_export` | Data was exported out of the system |
| `config_change` | A configuration value changed |

Each event records an `AuditResult` of `success`, `failure`, or `denied`.

## Audit event structure

```typescript
interface AuditEvent {
  id: string;                 // 'audit-<n>' sequential id
  timestamp: string;          // ISO timestamp, assigned on write
  actor: string;              // the identity id or 'system'
  actorType: IdentityType;    // 'user' | 'organization' | 'ai_agent' | 'connector' | 'skill'
  resource: string;           // resource affected (e.g. 'kg', 'secrets', 'auth')
  action: AuditAction;        // one of the 12 actions above
  result: AuditResult;        // 'success' | 'failure' | 'denied'
  organizationId: string;     // tenant scope
  details: Record<string, unknown>; // free-form event payload
  ipAddress?: string;         // optional source IP
  traceId?: string;           // optional distributed trace id
}
```

Events are written via `write(event: Omit<AuditEvent, 'id' | 'timestamp'>)` — the `id`
and `timestamp` are assigned automatically. The facade method `sg.writeAuditLog(event)`
does the same and additionally emits an `audit.written` telemetry event.

## Automatic audit events

The `SecurityGovernance` facade writes audit events automatically in two places:

- **`authenticate()`** — writes a `login` event with `result` `success` or `failure`
  and `details` containing the `method` and any `error`.
- **`authorize()`** — when a decision is denied, writes an `auth_denied` event with
  `result` `denied` and `details` containing the denial `reason` and `matchedBy` strategy.
- **`storeSecret()` / `getSecret()`** — writes `secret_access` events with an
  `operation` of `store` or `retrieve` in `details`.

## Querying and exporting

`AuditLog` implements `IAuditLog` with the following query capabilities:

| Method | Description |
|--------|-------------|
| `write(event)` | Append an event; returns the full `AuditEvent` with id/timestamp |
| `query(filter)` | Filter by org, actor, action, result, time range; paginate with `limit`/`offset` (default limit 100) |
| `getById(id)` | Retrieve a single event by id |
| `count(filter?)` | Total event count, or count matching a filter |
| `export(filter)` | Return all matching events with no limit (suitable for serialization) |

The `AuditQuery` filter supports `organizationId`, `actor`, `action`, `result`,
`startTime`, `endTime`, `limit`, and `offset`. Time comparisons are ISO-string
lexicographic.

## Code example

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();
const user = sg.createIdentity('user', 'Alice', 'org-1');

// Write an explicit audit event
const event = sg.writeAuditLog({
  actor: user.id,
  actorType: 'user',
  resource: 'knowledge_graph',
  action: 'kg_access',
  result: 'success',
  organizationId: 'org-1',
  details: { query: 'MATCH (n) RETURN n' },
});
console.log(event.id);        // 'audit-1'
console.log(event.timestamp); // ISO timestamp

// A denied authorization auto-writes an auth_denied event
sg.authorize({
  identityId: user.id, resource: 'secrets', action: 'write',
  organizationId: 'org-1', roles: ['viewer'],
});

// Query denied events
const denied = sg.queryAuditLog({ action: 'auth_denied', organizationId: 'org-1' });
console.log(denied.length);   // 1
console.log(denied[0].result); // 'denied'

// Count all events for an actor
console.log(sg.audit.count({ actor: user.id }));

// Export all events in an org (no pagination limit)
const all = sg.audit.export({ organizationId: 'org-1' });

// Retrieve a single event
const found = sg.audit.getById(event.id);
console.log(found?.action);   // 'kg_access'

// Time-range query
const recent = sg.queryAuditLog({
  organizationId: 'org-1',
  startTime: new Date(Date.now() - 60_000).toISOString(),
  limit: 50,
});
```
