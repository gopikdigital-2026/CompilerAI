# Organizations

## Organization Model

```typescript
interface Organization {
  organizationId:   string;
  name:             string;
  slug:             string;
  plan:             'free' | 'pro' | 'enterprise';
  status:           'ACTIVE' | 'SUSPENDED' | 'DELETED';
  settings:         OrganizationSettings;
  limits:           OrganizationLimits;
  logoUrl:          string | null;
  createdAt:        string;
  updatedAt:        string;
}
```

## Operations

| Operation | Method | Permission |
|-----------|--------|------------|
| Create | `createOrganization(name, plan)` | Any authenticated user |
| Update | `updateOrganization(id, updates)` | `organization:manage` |
| Suspend | `suspendOrganization(id)` | `organization:manage` |
| Reactivate | `reactivateOrganization(id)` | `organization:manage` |
| Soft delete | `deleteOrganization(id)` | Owner only |
| List | `listOrganizations()` | Platform admin |
| Update settings | `updateSettings(id, settings)` | `organization:manage` |

## Organization Settings

- `allowPublicWorkflows` — Allow workflows to be shared publicly
- `requireApprovalForExec` — Require approval before execution
- `defaultRiskTolerance` — LOW / MEDIUM / HIGH
- `maxConcurrentExecutions` — Concurrency limit

## Plan Limits

| Limit | Free | Pro | Enterprise |
|-------|------|-----|------------|
| Max workflows | 10 | 100 | Unlimited |
| Max executions/day | 100 | 1,000 | Unlimited |
| Max API keys | 3 | 20 | Unlimited |
| Max users | 5 | 50 | Unlimited |
| Max storage | 100 MB | 1 GB | Unlimited |

## Status Lifecycle

```
ACTIVE ←→ SUSPENDED → DELETED (soft)
```

Suspended organizations block all non-platform-admin access. Deleted organizations are hidden from lists but retain data.
