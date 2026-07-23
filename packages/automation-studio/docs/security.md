# Security

## Overview

Automation Studio enforces security through role-based access control, organization isolation, pre-publish validation, and a complete audit trail.

## Role-Based Permissions

Permissions are mapped to actions through the `SecurityService` permission map:

| Action | Required Permission |
|--------|-------------------|
| workflow:create | workflows:write |
| workflow:read | workflows:read |
| workflow:update | workflows:write |
| workflow:delete | workflows:delete |
| workflow:publish | workflows:publish |
| workflow:simulate | workflows:read |
| workflow:export | workflows:read |
| workflow:import | workflows:write |
| workflow:clone | workflows:read |
| workflow:rollback | workflows:publish |
| review:request | workflows:review |
| review:complete | workflows:review |
| comment:add | workflows:comment |
| monitor:view | workflows:read |

Permission checks are delegated to the `IIdentityAdapter`, which integrates with the CompilerAI Identity Platform.

## Organization Isolation

All workflow entities are scoped by `organizationId`. The `SecurityService.assertSameOrganization` method prevents cross-tenant access. The `IIdentityAdapter.assertSameOrganization` method enforces this at the identity layer.

## Pre-Publish Validation

Before a workflow can be published, the `SecurityService.assertCanPublish` method:
1. Checks the user has `workflows:publish` permission
2. Verifies the workflow belongs to the user's organization
3. Validates the workflow structure (trigger presence, no cycles, required fields)

If any check fails, an `AuthorizationError` is thrown.

## Audit Trail

All changes to workflows are recorded through `SecurityService.auditChange`:

- Workflow creation, updates, and deletion
- Node additions, removals, and updates
- Connection changes
- Publishing and unpublishing
- Cloning and importing
- Simulation runs
- Review requests and completions
- Comment additions and resolutions
- Rollbacks

Each audit entry includes:
- The actor (user ID and role names)
- The action taken
- A description
- Previous and new values (for updates)
- Timestamp

## Rollback Safety

Rollback restores a previous version snapshot without data loss:
1. The target version's snapshot is loaded from the version history
2. The workflow's nodes and connections are replaced with the snapshot
3. The workflow status reverts to `draft`
4. The rollback is recorded in the change history with `rolledBackFrom` and `rolledBackTo` metadata

## Integration with Identity Platform

The `IIdentityAdapter` interface connects to the CompilerAI Identity Platform:

```typescript
interface IIdentityAdapter {
  checkPermission(userId: string, organizationId: string, permission: string): Promise<boolean>;
  getUserRoles(userId: string, organizationId: string): Promise<string[]>;
  assertSameOrganization(userOrgId: string, targetOrgId: string): Promise<void>;
}
```

A `NullIdentityAdapter` is provided for standalone usage where all permissions are granted.
