# Policies

The Policy Engine applies declarative governance rules on top of RBAC and ABAC. Rules
are priority-sorted, first-match-wins, and each evaluation produces a full trace so
administrators can understand exactly why a decision was made.

## Policy effects

A policy rule's `effect` determines what happens when the rule matches. There are 5
effects:

| Effect | Meaning | Authorization outcome |
|--------|---------|-----------------------|
| `allow` | Explicitly permit the action | Allowed |
| `deny` | Explicitly forbid the action | Denied |
| `require_approval` | Permit only after human approval | Denied (pending approval) |
| `restricted` | Permit with noted restrictions | Allowed with `restricted` condition |
| `read_only` | Permit reads only | Non-read denied; read allowed |

When no rule matches, the engine's default decision is `allow`, deferring to the RBAC
and ABAC results. This makes the policy engine opt-in.

## Policy rule structure

```typescript
interface PolicyRule {
  id: string;                 // unique rule id
  name: string;               // human-readable name
  description: string;        // what the rule does
  effect: PolicyEffect;       // 'allow' | 'deny' | 'require_approval' | 'restricted' | 'read_only'
  priority: number;           // higher = evaluated first
  condition: PolicyCondition; // match criteria
  resources: ResourceCategory[]; // resources this rule applies to (empty = all)
  actions: PermissionAction[];    // actions this rule applies to (empty = all)
  roles: RoleName[];              // roles this rule applies to (empty = all)
}
```

Rules are added via `sg.addPolicyRule(rule)` (or `PolicyEngine.addRule`), which inserts
the rule and re-sorts the list by descending `priority`. The `createPolicyRule(...)`
factory provides a concise constructor with sensible defaults (priority 0, empty
arrays, empty condition).

## Condition matching

A rule's `PolicyCondition` narrows when it applies:

```typescript
interface PolicyCondition {
  organizationId?: string;                 // exact org match
  department?: string;                     // exact department match (from ABACContext)
  tags?: string[];                         // any tag overlap with ctx.tags
  timeWindow?: { start: string; end: string }; // ctx.timeOfDay within [start, end]
  daysOfWeek?: string[];                   // ctx.dayOfWeek in this list
  classification?: string[];               // ctx.resourceClassification in this list
  custom?: Record<string, unknown>;        // exact match against ctx.customAttributes
}
```

A rule matches a request only when **all** of the following hold:

1. **Resource** — `rule.resources` is empty or includes `request.resource`.
2. **Action** — `rule.actions` is empty or includes `request.action`.
3. **Roles** — `rule.roles` is empty or overlaps with `request.roles`.
4. **Condition** — every present condition field matches the request/ABAC context.

Empty arrays and absent condition fields act as wildcards.

## Evaluation trace

Every `evaluate()` call returns a `PolicyEvaluationResult`:

```typescript
interface PolicyEvaluationResult {
  decision: PolicyEffect;       // the winning effect, or 'allow' by default
  matchedRules: PolicyRule[];   // the rule(s) that matched (first match wins)
  reason: string;               // human-readable explanation
  trace: PolicyTraceEntry[];    // one entry per rule considered
  evaluatedAt: string;          // ISO timestamp
}

interface PolicyTraceEntry {
  ruleId: string;
  ruleName: string;
  effect: PolicyEffect;
  matched: boolean;
  reason: string;               // 'All conditions matched' | 'Conditions not met'
}
```

The `trace` array contains one entry for every rule evaluated up to and including the
first match, making it easy to audit why a particular decision was reached.

## Code example

```typescript
import { SecurityGovernance, createPolicyRule } from '@compilerai/security-governance';

const sg = new SecurityGovernance();

// Deny deletion of secrets by anyone
sg.addPolicyRule(createPolicyRule('deny-secret-delete', 'No Secret Deletion', 'deny', {
  priority: 100,
  description: 'Secrets may never be deleted via policy',
  resources: ['secrets'],
  actions: ['delete'],
}));

const result = sg.evaluatePolicy({
  identityId: 'u1', resource: 'secrets', action: 'delete',
  organizationId: 'org-1', roles: ['admin'],
});
console.log(result.decision);           // 'deny'
console.log(result.matchedRules[0].id); // 'deny-secret-delete'
console.log(result.trace[0].matched);   // true

// Require approval for writes to restricted resources
sg.addPolicyRule(createPolicyRule('approval-restricted', 'Approval for Restricted', 'require_approval', {
  priority: 50,
  resources: ['knowledge_graph', 'enterprise_rag'],
  actions: ['write'],
  condition: { classification: ['restricted'] },
}));

const approval = sg.evaluatePolicy({
  identityId: 'u1', resource: 'knowledge_graph', action: 'write',
  organizationId: 'org-1', roles: ['manager'],
  abacContext: sg.createABACContext('org-1', { resourceClassification: 'restricted' }),
});
console.log(approval.decision);  // 'require_approval'

// Read-only policy for auditors on connectors
sg.addPolicyRule(createPolicyRule('ro-connectors', 'Auditor Read-Only Connectors', 'read_only', {
  priority: 30, resources: ['connectors'], roles: ['auditor'],
}));

// Inspect and remove rules
console.log(sg.policies.count());          // 3
console.log(sg.policies.getRule('deny-secret-delete')?.effect); // 'deny'
sg.removePolicyRule('deny-secret-delete');
console.log(sg.policies.count());          // 2
```
