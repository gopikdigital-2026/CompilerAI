# Smart Retry Engine

The Retry Engine executes an async function up to a configurable number of attempts, with
backoff delays between retries and pluggable error filtering. It is implemented in
`src/retry/RetryEngine.ts` and modeled by the `IRetryEngine` interface.

---

## Backoff strategies

The `BackoffStrategy` type offers three strategies. The delay for attempt *N* (1-indexed)
is computed before the retry, then capped at `maxDelayMs`:

| Strategy | Formula | Example (`baseDelayMs=100`) |
|----------|---------|-----------------------------|
| `exponential` | `baseDelayMs * 2^(attempt-1)` | 100, 200, 400, 800, … |
| `linear` | `baseDelayMs * attempt` | 100, 200, 300, 400, … |
| `fixed` | `baseDelayMs` | 100, 100, 100, … |

After computing the base delay, it is capped: `delay = min(delay, maxDelayMs)`.

---

## Jitter

When `jitter: true`, a randomized offset is applied to spread retries in time and avoid
thundering-herd effects:

```
jitterAmount = delay * jitterFactor   // default jitterFactor = 0.5
delay = delay - jitterAmount + random() * jitterAmount * 2
```

This produces a symmetric random window of `±jitterAmount` around the base delay, clamped to
`>= 0`. The default `jitterFactor` of 0.5 yields delays in the range `[0.5×, 1.5×]` of the
computed backoff.

---

## Max attempts and retryable filtering

`RetryConfig` (created via `createRetryConfig`):

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxAttempts` | `number` | — (required) | Total attempts including the first call |
| `strategy` | `BackoffStrategy` | `exponential` | Delay computation strategy |
| `baseDelayMs` | `number` | `100` | Base delay used in the formula |
| `maxDelayMs` | `number` | `10000` | Upper cap on any single delay |
| `jitter` | `boolean` | `false` | Whether to apply jitter |
| `jitterFactor` | `number?` | `0.5` | Jitter magnitude as a fraction of delay |
| `isRetryable` | `RetryableErrorPredicate` | `() => true` | Predicate deciding if an error is retried |

### Retryable predicates

The engine stops immediately when `isRetryable(err)` returns `false` — no further attempts
are made. Two helpers are exported:

- **`isNetworkError(err)`** — true for errors whose message contains `timeout`,
  `connection`, `econnreset`, or `etimedout` (case-insensitive).
- **`isTransientError(err)`** — true unless the message contains `validation`,
  `unauthorized`, `forbidden`, or `not found`. Treats non-`Error` throws as transient.

Use these directly or supply a custom predicate:

```ts
isRetryable: (err) => err instanceof MyRetryableError
```

---

## Result

`execute` returns a `RetryResult<T>`:

| Field | Description |
|-------|-------------|
| `success` | Whether a call eventually succeeded |
| `result` | The successful return value (when `success`) |
| `error` | The last error (when `!success`) |
| `attempts` | Number of attempts actually made |
| `totalDelayMs` | Sum of all delay periods |
| `delays` | Array of each individual delay in ms |

---

## Code example

```ts
import {
  RetryEngine,
  createRetryConfig,
  isTransientError,
} from '@compilerai/resilience';

const engine = new RetryEngine();

const config = createRetryConfig({
  maxAttempts: 5,
  strategy: 'exponential',
  baseDelayMs: 100,
  maxDelayMs: 5000,
  jitter: true,
  jitterFactor: 0.5,
  isRetryable: isTransientError, // skip validation/401/403/404
});

const result = await engine.execute(async () => {
  const res = await fetch('https://api.example.com/flaky');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}, config);

if (result.success) {
  console.log('succeeded after', result.attempts, 'attempts');
  console.log('total delay:', result.totalDelayMs, 'ms');
} else {
  console.error('failed after', result.attempts, 'attempts:', result.error);
}
```

### Via the facade

```ts
import { ResiliencePlatform } from '@compilerai/resilience';

const platform = new ResiliencePlatform();
const r = await platform.retry(
  async () => riskyWork(),
  ResiliencePlatform.createDefaultRetryConfig(5),
);
// emits a retry.executed telemetry event
```

`executeProtected` combines retry with a circuit breaker: the function is wrapped in a
breaker, then retried, and circuit-open errors are treated as non-retryable so the engine
does not waste attempts while the breaker is open.
