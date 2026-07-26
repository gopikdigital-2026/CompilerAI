# Disaster Recovery

The Disaster Recovery module creates and executes recovery plans against RPO/RTO targets, in
either automatic or manual mode. It is implemented in
`src/scheduler/DisasterRecoveryManager.ts` and modeled by the `IDisasterRecoveryManager`
interface.

---

## RPO and RTO

The two core objectives are configured on `DisasterRecoveryConfig`:

| Concept | Field | Default | Meaning |
|---------|-------|---------|---------|
| **Recovery Point Objective** | `rpoSeconds` | `60` | Maximum acceptable data loss, measured in seconds of recent data. |
| **Recovery Time Objective** | `rtoSeconds` | `300` | Maximum acceptable time to restore service after a disaster. |

The config also includes `backupIntervalMs` (default `3600000` — 1 hour) and `maxBackups`
(default `10`), which govern the backup schedule and retention. During `executePlan`, the
manager compares the actual `recoveryTimeMs` against the configured RPO and RTO (scaled to
milliseconds) and reports `rpoMet` and `rtoMet` booleans in the result.

---

## Automatic vs manual recovery modes

`RecoveryMode` has two values:

| Mode | Behavior |
|------|----------|
| `automatic` | Plans execute without human approval. Step list: Assess Damage → Select Backup → Restore Data → Restart Services → Validate Integrity. |
| `manual` | An extra "Await Manual Approval" step is prepended to the plan, representing an operator gate before execution proceeds. |

The mode is set on `DisasterRecoveryConfig.mode` and stored on each `RecoveryPlan`. Use
`updateConfig(partial)` to change RPO/RTO/mode/backup settings after construction.

---

## Recovery plan creation and execution

`createPlan(config)` generates a `RecoveryPlan`:

| Field | Description |
|-------|-------------|
| `id` | Auto-generated `dr-plan-<n>` |
| `rpoSeconds` / `rtoSeconds` | Copied from the config |
| `mode` | `automatic` or `manual` |
| `steps` | Ordered `RecoveryStep[]` (5 or 6 steps) |
| `estimatedRecoveryTimeMs` | `steps.length * rtoSeconds * 100` |
| `createdAt` | ISO timestamp |

Each `RecoveryStep` is `{ id, name, action, target, completed }`.

`executePlan(planId)` runs every step in order, marking each `completed: true`, and returns a
`RecoveryExecutionResult`:

| Field | Description |
|-------|-------------|
| `planId` | The plan that was executed |
| `success` | `true` only when all steps completed |
| `completedSteps` / `totalSteps` | Progress counts |
| `recoveryTimeMs` | Wall-clock duration of execution |
| `rpoMet` | `config.rpoSeconds * 1000 >= recoveryTimeMs` |
| `rtoMet` | `config.rtoSeconds * 1000 >= recoveryTimeMs` |
| `timestamp` | ISO timestamp |

Executing an unknown plan id returns a failed result with `completedSteps: 0`.

---

## Step validation

`validateRecovery(planId)` returns `true` only when **every** step in the plan has
`completed: true`. Use it after execution (or after manual step completion) to confirm the
plan finished successfully. It returns `false` for an unknown plan id.

The standalone helper `createRecoveryPlan(rpoSeconds, rtoSeconds, mode)` builds a plan
without a manager instance — useful for inspection or testing.

---

## Code example

```ts
import {
  DisasterRecoveryManager,
  createDisasterRecoveryConfig,
  createRecoveryPlan,
} from '@compilerai/resilience';

const dr = new DisasterRecoveryManager(createDisasterRecoveryConfig({
  rpoSeconds: 60,
  rtoSeconds: 300,
  mode: 'automatic',
  backupIntervalMs: 3_600_000,
  maxBackups: 10,
}));

// Create a plan
const plan = dr.createPlan(dr.getConfig());
console.log(plan.steps.length); // 5 (automatic)

// Execute it
const result = dr.executePlan(plan.id);
console.log(result.success, result.completedSteps, result.totalSteps);
console.log(result.rpoMet, result.rtoMet);

// Validate
console.log(dr.validateRecovery(plan.id)); // true

// Manual mode adds an approval step
dr.updateConfig({ mode: 'manual' });
const manualPlan = dr.createPlan(dr.getConfig());
console.log(manualPlan.steps[0].name); // 'Await Manual Approval'
```

### Via the facade

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform({
  disasterRecoveryConfig: { rpoSeconds: 30, rtoSeconds: 120, mode: 'automatic' },
});

const plan = platform.createRecoveryPlan();         // uses platform's DR config
const result = platform.executeRecoveryPlan(plan.id);
console.log(result.rpoMet, result.rtoMet);

// Inspect all plans
console.log(platform.disasterRecovery.getPlans().length);
```

The facade's `createRecoveryPlan` accepts a partial config and merges it with the platform's
DR config via `createDisasterRecoveryConfig`, then delegates to the manager.
