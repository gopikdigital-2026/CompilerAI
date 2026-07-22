# Authorization

## Role-Based Access Control (RBAC)

The API enforces role-based permissions. Each role grants a set of permissions. Multiple roles accumulate permissions.

## Roles

| Role | Description |
|------|-------------|
| `PLATFORM_ADMIN` | Full platform access — all operations |
| `ORGANIZATION_ADMIN` | Full org access — all operations within their org |
| `WORKFLOW_EDITOR` | Create, read, and publish workflows |
| `EXECUTION_OPERATOR` | Create, read, pause, resume, cancel executions; read telemetry |
| `APPROVER` | Read and decide approvals; read executions |
| `VIEWER` | Read-only access to executions, workflows, approvals, telemetry |

## Permissions

| Permission | Description |
|------------|-------------|
| `execution:create` | Create new executions |
| `execution:read` | Read execution status and results |
| `execution:pause` | Pause running executions |
| `execution:resume` | Resume paused executions |
| `execution:cancel` | Cancel executions |
| `workflow:create` | Create and validate workflows |
| `workflow:read` | Read workflow definitions |
| `workflow:publish` | Activate/deactivate workflow versions |
| `approval:read` | List and view approval requests |
| `approval:decide` | Approve, reject, or request changes |
| `telemetry:read` | Read execution events and traces |

## Role-Permission Matrix

| Permission | PLATFORM_ADMIN | ORG_ADMIN | WORKFLOW_EDITOR | EXECUTION_OPERATOR | APPROVER | VIEWER |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|
| execution:create | ✓ | ✓ | | ✓ | | |
| execution:read | ✓ | ✓ | | ✓ | ✓ | ✓ |
| execution:pause | ✓ | ✓ | | ✓ | | |
| execution:resume | ✓ | ✓ | | ✓ | | |
| execution:cancel | ✓ | ✓ | | ✓ | | |
| workflow:create | ✓ | ✓ | ✓ | | | |
| workflow:read | ✓ | ✓ | ✓ | | | ✓ |
| workflow:publish | ✓ | ✓ | ✓ | | | |
| approval:read | ✓ | ✓ | | | ✓ | ✓ |
| approval:decide | ✓ | ✓ | | | ✓ | |
| telemetry:read | ✓ | ✓ | | ✓ | | ✓ |

## Error Responses

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Insufficient permissions | 403 | `ACCESS_DENIED` |
| Cross-organization access | 404 | `RESOURCE_NOT_FOUND` |

Cross-org access returns 404 (not 403) to hide resource existence from users outside the owning organization.
