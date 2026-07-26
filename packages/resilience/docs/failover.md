# Failover & High Availability

The Failover module maintains a registry of service instances, selects an active instance
according to a load-balancing strategy, and automatically promotes a standby when the active
instance fails. It is implemented in `src/failover/FailoverManager.ts` and modeled by the
`IFailoverManager` interface.

---

## Instances

Each `Instance` carries:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Human-readable name |
| `status` | `InstanceStatus` | `active` \| `standby` \| `failed` \| `recovering` |
| `endpoint` | `string` | Service endpoint URL |
| `priority` | `number` | Lower number = higher priority |
| `healthScore` | `number` | 0–100 load/health indicator (higher = healthier) |
| `lastCheckedAt` | `string?` | ISO timestamp of last health check |

Use the `createInstance(id, name, endpoint, priority)` helper to create a standby instance
with `healthScore: 100`.

---

## Load-balancing strategies

`FailoverConfig.loadBalancingStrategy` selects how the next instance is chosen during
failover:

| Strategy | Selection logic |
|----------|-----------------|
| `priority` | Among `standby`/`active` instances, pick the one with the lowest `priority` number that is not currently active. |
| `round_robin` | Cycle through `standby` instances in turn using an internal index. |
| `least_load` | Pick the `standby` instance with the highest `healthScore`. |

On construction, if no instance is already `active`, the manager promotes the highest-priority
standby automatically.

---

## Automatic failover

`failover(reason)` performs the core failover:

1. The current active instance is marked `failed`.
2. `selectInstance()` chooses the next candidate per the configured strategy.
3. The candidate is promoted to `active`.
4. A `FailoverEvent` (`{ fromInstanceId, toInstanceId, reason, timestamp }`) is recorded and
   returned. If no candidate is available, `null` is returned.

`markFailed(instanceId)` marks an instance failed and, if it was the active instance,
automatically triggers a failover with a descriptive reason. `markRecovered(instanceId)`
returns an instance to `standby` with `healthScore: 100`.

The full event history is available via `getFailoverEvents()`.

---

## Code example

```ts
import {
  FailoverManager,
  createFailoverConfig,
  createInstance,
} from '@compilerai/resilience';

const instances = [
  createInstance('inst-1', 'Primary',   'http://primary:8080',   1),
  createInstance('inst-2', 'Secondary', 'http://secondary:8080', 2),
  createInstance('inst-3', 'Tertiary',  'http://tertiary:8080',  3),
];

const failover = new FailoverManager(createFailoverConfig(instances, {
  loadBalancingStrategy: 'priority',
  healthCheckIntervalMs: 5000,
  failoverThreshold: 3,
}));

console.log(failover.getActiveInstance()?.id); // 'inst-1'

// Simulate primary failure
const event = failover.failover('primary health check failed');
console.log(event?.toInstanceId); // 'inst-2'

// Mark an instance failed — triggers failover if it was active
failover.markFailed('inst-2');
console.log(failover.getActiveInstance()?.id); // 'inst-3'

// Recover an instance back to standby
failover.markRecovered('inst-1');
console.log(failover.getFailoverEvents().length);
```

### Via the facade

Provide instances to the `ResiliencePlatform` constructor and use `triggerFailover`:

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform({
  instances: ResiliencePlatform.createDefaultInstances(),
});

const event = platform.triggerFailover('manual rotation');
// emits a failover.started telemetry event

const active = platform.failover?.getActiveInstance();
```

When no instances are supplied, `platform.failover` is `undefined` and `triggerFailover`
returns `null`. The health report uses `failover.countActive()` and `getAllInstances()`
to compute the active/total instance counts.
