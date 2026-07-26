# Health Monitoring

The `HealthMonitor` runs registered health checkers, caches their last result,
and rolls all results up into a single overall status.

## Health states

Three states are defined, in increasing severity:

`healthy` → `warning` → `critical`

## The eight health checks

The package ships eight factory functions, each returning a checker
(`() => Promise<HealthCheckResult>`) with built-in thresholds:

| Factory | Monitors | Thresholds |
|---------|----------|------------|
| `createAvailabilityCheck(component, isUp)` | Uptime | `critical` when down |
| `createMemoryCheck(getUsagePercent)` | Memory | `>90%` critical, `>75%` warning |
| `createQueueCheck(getQueueDepth, maxDepth=1000)` | Queue depth | `>maxDepth` critical, `>70%` warning |
| `createConnectorCheck(getActiveConnectors, minExpected=1)` | Connectors | `<minExpected` critical, `<2×` warning |
| `createRagIndexCheck(getIndexSize)` | RAG index | `0` critical, `<10` warning |
| `createKnowledgeGraphCheck(getNodeCount)` | Knowledge graph | `0` critical, else healthy |
| `createSkillsCheck(getInstalledCount)` | Skills | `0` warning, else healthy |
| `createAuthCheck(getAuthSuccessRate)` | Auth | `<90%` critical, `<98%` warning |

## Overall status computation

`getOverallStatus()` applies a worst-case rollup over the cached results:

- Returns `critical` if **any** check is `critical`.
- Else returns `warning` if **any** check is `warning`.
- Else returns `healthy`.
- Returns `healthy` when no checks are registered.

`getChecks()` returns the last cached result for each registered check; a
check that has never been run contributes nothing to the rollup.

## Registering and running checks

`registerCheck(name, component, checker)` stores a checker. `runCheck(name)`
invokes it, caches the `HealthCheck`, and returns it; a missing or throwing
checker yields a `critical` result with a descriptive message.
`runAllChecks()` runs every registered check sequentially.

## Code example

```ts
import {
  ObservabilityPlatform,
  createAvailabilityCheck,
  createMemoryCheck,
  createQueueCheck,
  createAuthCheck,
} from '@compilerai/observability';

const platform = new ObservabilityPlatform();

let mem = 62;
let authRate = 99;

platform.registerHealthCheck(
  'connector_runtime_availability',
  'connector_runtime',
  createAvailabilityCheck('connector_runtime', () => true),
);
platform.registerHealthCheck(
  'memory_usage',
  'observability',
  createMemoryCheck(() => mem),
);
platform.registerHealthCheck(
  'auth_success',
  'security_governance',
  createAuthCheck(() => authRate),
);
platform.registerHealthCheck(
  'task_queue',
  'automation_studio',
  createQueueCheck(() => 420, 1000),
);

await platform.runAllHealthChecks();
console.log(platform.healthStatus()); // 'healthy'

mem = 93;                              // push memory into critical
authRate = 94;                         // push auth into warning
await platform.runAllHealthChecks();
console.log(platform.healthStatus()); // 'critical' (worst-case rollup)

const authCheck = platform.health.getChecks().find((c) => c.name === 'auth_success');
console.log(authCheck?.status);        // 'warning'
console.log(authCheck?.message);       // 'Authentication success rate: 94%'
```

You can also write a custom checker inline — any `() =>
Promise<HealthCheckResult>` is accepted.
