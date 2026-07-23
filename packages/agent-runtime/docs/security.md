# Security

## Core Principles

1. **Organization isolation** — All agents, tasks, and executions are scoped by `organizationId`
2. **Permission validation** — Agents must declare and have the permissions a task requires
3. **Message sanitization** — Secrets are redacted from all inter-agent messages
4. **No secret transmission** — API keys, tokens, and credentials are never passed between agents
5. **Dangerous permission blocking** — Configurable blocklist prevents agents with dangerous permissions

## Organization Isolation

Every agent is registered with an `organizationId`. The `AgentRegistry` enforces this:

- `getByOrganization(orgId)` returns only that org's agents
- `AgentPolicyEngine.assertOrganization()` throws `AgentIsolationError` on mismatch
- The dispatcher only considers agents from the same organization as the task
- One organization cannot see, schedule, or cancel another organization's agents

## Permission Validation

The `AgentPolicyEngine` validates:

1. **Task requirements** — The agent must have all `requiredPermissions` and `requiredCapabilities` declared in the task
2. **Blocked permissions** — If an agent declares a permission in the `blockedPermissions` list, it is rejected entirely
3. **Profile validation** — Agent profiles are validated at registration time (cost ≥ 0, confidence 0–1, max duration > 0)

```typescript
const runtime = new AgentRuntime({
  // ...
  blockedPermissions: ['execute:shell', 'org:admin'],
});
```

## Message Sanitization

All messages published through the `AgentCommunicationBus` are sanitized:

- Keys matching `api_key`, `token`, `secret`, `password`, `bearer`, `authorization`, `credential` → `[REDACTED]`
- String values containing `sk-*` or `Bearer *` patterns → pattern replaced with `[REDACTED]`
- Nested objects are recursively sanitized
- Every message has `sanitized: true` set

The `sanitizeMessagePayload()` function is exported for standalone use.

## Agent Isolation

Agents are isolated from each other:

- An agent only receives tasks dispatched to it by the coordinator
- Agents cannot directly communicate with each other — all communication goes through the coordinator via the bus
- The `toAgentId` field on messages is either a specific agent ID or `null` (broadcast to coordinator)
- A failed agent is marked `dead` and excluded from future scheduling

## Health-Based Isolation

Defective agents are automatically isolated:

- After 3 consecutive failures, an agent is marked `dead`
- Dead agents are never selected by the scheduler
- Dead agents can be manually revived via `healthMonitor.recordHeartbeat(agentId)`

## Threat Model

| Threat | Mitigation |
|---|---|
| Cross-org data access | `organizationId` isolation in registry, policy engine, and dispatcher |
| Agent with excessive permissions | `blockedPermissions` config + policy validation |
| Secret leakage in messages | Automatic sanitization of all message payloads |
| Rogue agent execution | No code execution — executor function is provided by the caller |
| Agent crash | Health monitoring + recovery + checkpoint resume |
| Deadlock from circular dependencies | Task graph dependency resolution — tasks with unsatisfied dependencies are not dispatched |
