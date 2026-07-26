# Authorization

Authorization in `@compilerai/security-governance` combines role-based access control
(RBAC) with attribute-based access control (ABAC) and a policy engine. The
`AuthorizationEngine` orchestrates all three to produce a single `AuthorizationDecision`.

## RBAC — role-based access control

There are 7 built-in roles, each with an explicit allow-list of resource/action
permissions and a priority:

| Role | Priority | Description |
|------|----------|-------------|
| `owner` | 100 | Full control over all resources including settings and secrets |
| `admin` | 90 | Administrative access to all operational resources |
| `manager` | 70 | Manage workflows, agents, and knowledge resources |
| `ai_agent` | 60 | AI agent with execution capabilities on operational resources |
| `employee` | 50 | Standard operational access for daily work |
| `auditor` | 40 | Read-only access to all resources and audit logs |
| `viewer` | 20 | Read-only access to primary resources |

### Permission matrix

The table below summarizes the actions each role may perform on each resource
(`R`=read, `W`=write, `X`=execute, `D`=delete, `A`=admin, `–`=none):

| Resource \ Role | owner | admin | manager | ai_agent | employee | auditor | viewer |
|-----------------|:-----:|:-----:|:-------:|:--------:|:--------:|:-------:|:------:|
| knowledge_graph | RWXDA | RWXD  | RWX     | RWX      | RX      | R       | R      |
| enterprise_rag  | RWXDA | RWXD  | RWX     | RX       | RX      | R       | R      |
| skills_marketplace | RWXDA | RWXD | RWX  | RX       | RX      | R       | R      |
| multi_agent     | RWXDA | RWXD  | RWX     | RWX      | RX      | R       | R      |
| connectors      | RWXDA | RWXD  | RX      | RX       | R       | R       | –      |
| workflows       | RWXDA | RWXD  | RWX     | RWX      | RX      | R       | R      |
| settings        | RWA   | RW    | –       | –        | –       | –       | –      |
| audit           | RA    | R     | R       | –        | –       | R       | –      |
| secrets         | RWDA  | RW    | –       | –        | –       | R       | –      |

Permission checks use `hasRolePermission(role, resource, action)`, which scans the
role's permission list for a matching `resource` with `action` in its `actions` array.

## ABAC — attribute-based access control

ABAC evaluates contextual attributes supplied in an `ABACContext` alongside the RBAC
check. The supported attributes are:

| Attribute | Type | Purpose |
|-----------|------|---------|
| `organizationId` | `string` | Must match the request's `organizationId` |
| `department` | `string?` | Department label for department-scoped rules |
| `tags` | `string[]?` | Subject tags for tag-overlap checks |
| `timeOfDay` | `string?` | `HH:mm` 24-hour clock for business-hours rules |
| `dayOfWeek` | `string?` | Day name (e.g. `Saturday`) for weekend rules |
| `resourceClassification` | `'public'\|'internal'\|'confidential'\|'restricted'?` | Classification gating |
| `resourceTags` | `string[]?` | Tags on the target resource |
| `resourceOwner` | `string?` | Owner of the target resource |
| `customAttributes` | `Record<string, unknown>?` | Arbitrary custom attributes |

ABAC enforces the following rules within `evaluateABAC`:

- **Organization mismatch** — denied if `ctx.organizationId !== request.organizationId`.
- **Restricted classification** — denied unless the request includes `owner` or `admin`.
- **Confidential classification** — denied for a sole `viewer` role.
- **Time-of-day restriction** — write actions outside 08:00–18:00 are denied for non-
  owner/admin roles.
- **Weekend restriction** — non-read actions on `Saturday`/`Sunday` are denied for non-
  owner/admin roles.
- **Department tag overlap** — evaluated for non-read actions when both `tags` and
  `resourceTags` are present.

Owner and admin roles bypass the time, weekend, and restricted-classification rules.

## Authorization decision flow

```
authorize(request)
  │
  ├─ 1. RBAC: does any role grant (resource, action)?
  │      yes → rbacGranted = true
  │
  ├─ 2. ABAC: if abacContext present, evaluateABAC(request)
  │      denied → return { allowed: false, matchedBy: 'abac' }
  │
  ├─ 3. RBAC gate: if !rbacGranted
  │      return { allowed: false, matchedBy: 'denied' }
  │
  ├─ 4. Policy: PolicyEngine.evaluate(request)
  │      deny            → { allowed: false, matchedBy: 'policy' }
  │      require_approval → { allowed: false, matchedBy: 'policy' }
  │      read_only       → non-read denied; read allowed
  │      restricted      → { allowed: true, matchedBy: 'policy' }
  │
  └─ 5. Default → { allowed: true, matchedBy: 'rbac' }
```

The returned `AuthorizationDecision` includes `allowed`, a human-readable `reason`, the
`matchedBy` strategy (`rbac` | `abac` | `policy` | `denied`), optional `conditions`,
and an `evaluatedAt` timestamp.

## Code example

```typescript
import { SecurityGovernance } from '@compilerai/security-governance';

const sg = new SecurityGovernance();
const user = sg.createIdentity('user', 'Bob', 'org-1');

// RBAC: employee can read the knowledge graph
const readDecision = sg.authorize({
  identityId: user.id, resource: 'knowledge_graph', action: 'read',
  organizationId: 'org-1', roles: ['employee'],
});
console.log(readDecision.allowed);    // true
console.log(readDecision.matchedBy);  // 'rbac'

// RBAC: viewer cannot write
const writeDecision = sg.authorize({
  identityId: user.id, resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['viewer'],
});
console.log(writeDecision.allowed);   // false
console.log(writeDecision.matchedBy); // 'denied'

// ABAC: business-hours write for an employee
const abacDecision = sg.authorize({
  identityId: user.id, resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['employee'],
  abacContext: sg.createABACContext('org-1', {
    timeOfDay: '14:00', dayOfWeek: 'Tuesday', resourceClassification: 'internal',
  }),
});
console.log(abacDecision.allowed);    // true (RBAC grants, ABAC passes)

// ABAC: after-hours write is denied for employees
const afterHours = sg.authorize({
  identityId: user.id, resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['employee'],
  abacContext: sg.createABACContext('org-1', { timeOfDay: '23:00' }),
});
console.log(afterHours.allowed);      // false
console.log(afterHours.matchedBy);    // 'abac'
console.log(afterHours.conditions);   // ['time_restriction']

// Direct role-permission helper
import { hasRolePermission } from '@compilerai/security-governance';
console.log(hasRolePermission('auditor', 'audit', 'read'));  // true
console.log(hasRolePermission('viewer', 'secrets', 'read')); // false
```
