# Audit Log

## Append-Only Design

Audit log entries can only be created (INSERT) and read (SELECT). No UPDATE or DELETE policies exist — entries are immutable.

## AuditLogEntry

```typescript
interface AuditLogEntry {
  auditLogId:    string;
  organizationId: string;
  actorId:       string;
  action:        AuditableAction;
  resourceType:  string;
  resourceId:    string | null;
  result:        'SUCCESS' | 'FAILURE';
  correlationId: string | null;
  requestId:     string | null;
  metadata:      Record<string, unknown>;
  timestamp:     string;
}
```

## Auditable Actions

`workflow.create`, `workflow.publish`, `workflow.deactivate`, `execution.create`, `execution.pause`, `execution.resume`, `execution.cancel`, `approval.approve`, `approval.reject`, `approval.request_changes`, `api_key.create`, `api_key.revoke`, `permission.modify`, `memory.delete`, `admin.config_change`.

## AuditLogger

```typescript
const logger = new AuditLogger(repo, idGen);
await logger.log({
  organizationId: 'org-1',
  actorId: 'user-1',
  action: 'workflow.create',
  resourceType: 'workflow',
  resourceId: 'wf-1',
  result: 'SUCCESS',
});
```

## Querying

- `findByOrganization(orgId, limit, cursor?)` — Paginated, cursor-based
- `findByActor(orgId, actorId, limit)` — Filter by actor
- `findByAction(orgId, action, limit)` — Filter by action type
