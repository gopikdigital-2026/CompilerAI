# Circuit Breaker

The Circuit Breaker protects downstream operations from cascading failures by stopping calls
to a failing service until it has a chance to recover. It is implemented in
`src/circuit-breaker/CircuitBreaker.ts` and modeled by the `ICircuitBreaker` interface.

---

## States

The breaker has three states, represented by the `CircuitState` type:

| State | Behavior |
|-------|----------|
| `closed` | Calls pass through. Failures are counted in a rolling window. |
| `open` | Calls are rejected immediately with `Circuit breaker '<name>' is open`. |
| `half_open` | A limited number of trial calls are allowed to probe recovery. |

### State transition diagram

```
                    failureThreshold reached
                    or failurePercentageThreshold exceeded
      ┌──────────────────────────────────────────────────┐
      ▼                                                  │
 ┌─────────┐  resetTimeoutMs elapsed   ┌───────────┐ trial call fails
 │ closed  │ ────────────────────────▶ │ half_open │ ──────────────┐
 └─────────┘                           └───────────┘               │
      ▲                                      │ trial call           │
      │ trial call(s) succeed                │ succeeds             │
      └──────────────────────────────────────┘                      │
      │                                                             │
      │                                                             ▼
      │                                                         ┌──────┐
      └───────────────────────────────────────────────────────── │ open │
                                                                └──────┘
```

- **closed → open**: triggered when `consecutiveFailures >= failureThreshold`, or when the
  rolling window is full and the failure percentage reaches `failurePercentageThreshold`.
- **open → half_open**: after `resetTimeoutMs` elapses since the last failure, the next
  `execute()` call transitions to `half_open` instead of throwing.
- **half_open → closed**: a trial call succeeds.
- **half_open → open**: a trial call fails (or `halfOpenMaxCalls` is exceeded).

---

## Configuration

`CircuitBreakerConfig` (created via `createCircuitBreakerConfig`):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | `string` | — (required) | Breaker name, used in errors and stats |
| `failureThreshold` | `number` | `5` | Consecutive failures that trip the breaker |
| `failurePercentageThreshold` | `number?` | `undefined` | Rolling-window failure % that trips the breaker |
| `resetTimeoutMs` | `number` | `30000` | Time in `open` before transitioning to `half_open` |
| `windowSize` | `number` | `20` | Number of recent calls kept for percentage calculation |
| `halfOpenMaxCalls` | `number` | `3` | Max trial calls allowed in `half_open` |

Both tripping mechanisms can be active simultaneously: the breaker trips if **either** the
consecutive-failure count **or** the windowed failure percentage is exceeded.

---

## Code example

```ts
import {
  CircuitBreaker,
  createCircuitBreakerConfig,
  type CircuitBreakerStats,
} from '@compilerai/resilience';

const breaker = new CircuitBreaker(createCircuitBreakerConfig('payments-api', {
  failureThreshold: 5,
  failurePercentageThreshold: 60, // trip if >60% of last 20 calls fail
  resetTimeoutMs: 30000,
  windowSize: 20,
  halfOpenMaxCalls: 3,
}));

// Execute a protected call
try {
  const data = await breaker.execute(async () => {
    return fetch('https://payments.example.com/charge').then((r) => {
      if (!r.ok) throw new Error('Payment failed');
      return r.json();
    });
  });
} catch (err) {
  // Either the call failed, or the breaker is open
  console.error(err);
}

// Inspect stats
const stats: CircuitBreakerStats = breaker.getStats();
console.log(stats.state);              // 'closed' | 'open' | 'half_open'
console.log(stats.consecutiveFailures);
console.log(stats.windowFailures);

// Manual control
breaker.open();   // force open
breaker.close();  // force closed
breaker.reset();  // close + clear window + reset counters
```

### Via the facade

The `ResiliencePlatform` facade manages breakers by name and emits telemetry on manual
transitions:

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform();
const result = await platform.executeProtected(
  async () => risky(),
  { circuitName: 'payments-api' },
);

platform.openCircuit('payments-api');   // emits circuit.opened
platform.closeCircuit('payments-api');  // emits circuit.closed
```

A breaker is created lazily the first time its name is referenced via `executeProtected`,
`openCircuit`, or `closeCircuit`.

---

## Stats

`getStats()` returns a `CircuitBreakerStats` snapshot including `totalCalls`,
`totalFailures`, `totalSuccesses`, `consecutiveFailures`, `lastFailureTime`,
`lastStateChange`, `windowCalls`, and `windowFailures` — useful for dashboards and health
checks.
