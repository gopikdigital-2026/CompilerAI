# Approvals API

## Overview

The approvals API manages human-in-the-loop approval gates. When a workflow node with `requiresApproval: true` is reached, the runtime creates an `ApprovalRequest` and pauses the execution.

## Endpoints

### List Pending Approvals

```
GET /api/v1/approvals
```

**Required permissions:** `approval:read`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `executionId` | string | — | Filter by execution |
| `status` | string | — | Filter by status |
| `limit` | integer | 20 | Max 100 |
| `cursor` | string | — | Pagination cursor |

Returns a paginated list of approval requests for the authenticated organization.

### Get Approval

```
GET /api/v1/approvals/{approvalId}
```

**Required permissions:** `approval:read`

Returns the approval details. Cross-org access returns 404.

### Approve

```
POST /api/v1/approvals/{approvalId}/approve
```

**Required permissions:** `approval:decide`

**Request Body:**

```json
{
  "comment": "Looks good, proceeding.",
  "metadata": {}
}
```

Resolves the approval as `APPROVED`. The execution resumes automatically.

### Reject

```
POST /api/v1/approvals/{approvalId}/reject
```

**Required permissions:** `approval:decide`

Resolves the approval as `REJECTED`. The execution transitions to `BLOCKED` or `FAILED`.

### Request Changes

```
POST /api/v1/approvals/{approvalId}/request-changes
```

**Required permissions:** `approval:decide`

Resolves the approval as `CHANGES_REQUESTED`. The comment is recorded as a requested change.

## Approval States

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting decision |
| `APPROVED` | Approved — execution resumes |
| `REJECTED` | Rejected — execution blocked |
| `CHANGES_REQUESTED` | Changes requested — execution blocked with feedback |

## Error Responses

| Scenario | HTTP Status | Error Code |
|----------|-------------|------------|
| Approval not found | 404 | `APPROVAL_NOT_FOUND` |
| Already resolved | 409 | `INVALID_EXECUTION_STATE` |
| Missing comment | 400 | `VALIDATION_ERROR` |
| Insufficient permissions | 403 | `ACCESS_DENIED` |
