# Operations Guide — CompilerAI Enterprise v1.0 RC1

This guide covers day-to-day operations: health monitoring, alert management, observability dashboards, backup and verification, queue monitoring, circuit breaker management, failover, disaster recovery, and performance monitoring.

---

## Day-to-Day Operations

The `@compilerai/observability` and `@compilerai/resilience` packages provide the operational tooling. Key operational tasks:

1. **Check system health** — Review the 8 health checks and overall status.
2. **Triage alerts** — Review active alerts, acknowledge, and resolve.
3. **Monitor dashboards** — Watch the 8 dashboard types for anomalies.
4. **Verify backups** — Confirm scheduled backups completed and pass integrity checks.
5. **Monitor queues** — Check queue depth and recover stuck items.
6. **Review circuit breakers** — Check for open breakers and investigate root causes.
7. **Performance monitoring** — Watch latency, throughput, and error rates.

---

## Health Monitoring

The `HealthMonitor` runs 8 pre-built health checks. Each check returns one of 3 states.

### Health check states (3)

| State | Meaning |
|-------|---------|
| `healthy` | Check passed, component is operating normally |
| `warning` | Check passed but a threshold is approaching (e.g., memory > 75%) |
| `critical` | Check failed or a critical threshold was exceeded |

Overall status: if any check is `critical`, the system is `critical`. If any check is `warning` (and none critical), the system is `warning`. Otherwise `healthy`.

### Health checks (8)

| Check | Component | What it monitors | Warning | Critical |
|-------|-----------|------------------|---------|----------|
| Availability | `connector_runtime` | Service is up | — | Down |
| Memory | `observability` | Memory usage % | > 75% | > 90% |
| Queue | `connector_runtime` | Queue depth vs. max | > 70% of max | > max |
| Connectors | `connector_runtime` | Active connector count | — | 0 connectors |
| RAG index | `enterprise_rag` | RAG index size | < 10 entries | 0 entries |
| Knowledge graph | `knowledge_graph` | Node count | < 10 nodes | — |
| Skills | `skills_marketplace` | Installed skill count | 0 skills | — |
| Auth | `security_governance` | Auth failure rate % | > 2% | > 10% |

### Monitoring health

```typescript
// Run all health checks
const checks = await observability.health.runAllChecks();
const overall = observability.health.getOverallStatus();

// Run a specific check
const memoryCheck = await observability.health.runCheck('memory');
console.log(memoryCheck.status);  // 'healthy' | 'warning' | 'critical'
```

The health endpoints (`GET /api/v1/health` and `GET /api/v1/ready`) expose this data for load balancer and Kubernetes probes.

---

## Alert Management

The alert engine supports 7 alert types, 4 severity levels, and acknowledgment-based lifecycle management.

### Alert types (7)

| Alert type | Description |
|------------|-------------|
| `high_latency` | Request latency exceeds threshold |
| `repetitive_errors` | Error rate exceeds threshold |
| `connector_down` | A connector is unavailable |
| `excessive_consumption` | Resource consumption exceeds budget |
| `auth_failures` | Authentication failure rate exceeds threshold |
| `rag_degradation` | RAG retrieval quality degraded |
| `agent_anomaly` | Agent behavior anomaly detected |

### Severity levels (4)

| Severity | Description |
|----------|-------------|
| `info` | Informational — no action needed |
| `warning` | Potential issue — investigate when convenient |
| `error` | Issue impacting users — act promptly |
| `critical` | Severe impact — act immediately |

### Alert rules

Each alert rule has:
- `id`, `name`, `type`, `severity`, `component`
- `condition` — the threshold or pattern that triggers the alert
- `enabled` — toggle to disable without deleting
- `cooldownMs` — deduplication window to prevent alert storms

### Alert lifecycle

1. **Triggered** — Condition met, alert created.
2. **Active** — Alert is visible in the alert list.
3. **Acknowledged** — Operator acknowledges the alert (prevents duplicate responses).
4. **Resolved** — Condition clears, alert auto-resolves.

```typescript
// List active alerts filtered by type/severity/component
const alerts = observability.alerts.getAlerts({
  severity: 'critical',
  component: 'connector_runtime',
});

// Acknowledge an alert
observability.alerts.acknowledge(alertId, 'operator-id');
```

---

## Observability Dashboard Setup

8 dashboard types are available, each with auto-generated default widgets. Widget types: `line`, `gauge`, `table`, `counter`, `bar`, `heatmap`.

### Dashboard types (8)

| Type | Description | Key Metrics |
|------|-------------|-------------|
| `global_health` | Overall system health | Availability, latency, error rate |
| `ai_agents` | Agent performance | Agent operations, blocked agents |
| `connectors` | Connector status | Active connectors, failures |
| `rag` | RAG retrieval quality | Index size, retrieval latency |
| `security` | Security posture | Auth failures, API key usage |
| `skills` | Skill marketplace | Invocations, stability |
| `costs` | Cost tracking | Cost per operation, org usage |
| `organizations` | Per-org metrics | Operations, resource usage |

### Creating dashboards

```typescript
// Create with default widgets
const dashboard = observability.dashboards.create(
  'global_health',
  'Production Health',
  { description: 'Main production health dashboard' }
);

// Create with custom widgets
const custom = observability.dashboards.create(
  'ai_agents',
  'Agent Team Performance',
  {
    widgets: [
      { title: 'Agent Operations', metric: 'agent.operations', component: 'multi_agent', type: 'line' },
      { title: 'Blocked Agents', metric: 'agent.blocked', component: 'multi_agent', type: 'counter' },
    ],
  }
);
```

### Metric names (10 standard metrics)

| Constant | Metric name | Type |
|----------|-------------|------|
| `LATENCY` | `request.latency` | timer |
| `THROUGHPUT` | `request.throughput` | counter |
| `ERRORS` | `request.errors` | counter |
| `AVAILABILITY` | `system.availability` | gauge |
| `MEMORY` | `system.memory_usage` | gauge |
| `CPU` | `system.cpu_usage` | gauge |
| `ORG_USAGE` | `organization.operations` | counter |
| `COST_PER_OP` | `cost.per_operation` | gauge |
| `AGENT_USAGE` | `agent.operations` | counter |
| `SKILL_USAGE` | `skill.invocations` | counter |

### Exporters

Telemetry can be exported in 3 formats: JSON, Prometheus, and OpenTelemetry (mock). Use the Prometheus exporter to feed Grafana or Datadog.

---

## Backup Schedule and Verification

### Backup types

| Type | Description |
|------|-------------|
| `full` | Complete snapshot of the target |
| `incremental` | Delta from the parent snapshot |

### Replication targets (4)

`knowledge_graph`, `enterprise_rag`, `shared_memory`, `configuration`.

### Backup schedule

Configure via the `BackupManager`:

```typescript
resilience.createBackup('knowledge_graph', data, { type: 'full' });
resilience.createBackup('knowledge_graph', data, { type: 'incremental', parentId: lastSnapshotId });
```

### Backup status

Each snapshot has a status: `completed`, `failed`, or `in_progress`. Completed snapshots include:
- `sizeBytes` — snapshot size
- `checksum` — integrity checksum
- `validated` — whether integrity has been verified

### Verification

After every backup:
1. Check `status === 'completed'`.
2. Verify `validated === true` (checksum matches).
3. Periodically test-restore a snapshot and confirm `integrityValid === true` and `recordsRestored > 0`.
4. Retire old snapshots beyond `maxBackups` to control storage.

---

## Queue Monitoring and Recovery

### Queue item types (4)

`pending_job`, `workflow`, `agent_task`, `event`.

### Queue item status

`pending` → `processing` → `completed` | `failed`

### Monitoring

```typescript
const pending = resilience.queue.getPending();
const stats = {
  pending: pending.length,
  processing: resilience.queue.getProcessing().length,
  failed: resilience.queue.getFailed().length,
};
```

### Recovery

The queue recovery process reprocesses stuck items idempotently:

```typescript
const result = resilience.queue.recoverStuckItems();
// result: { totalItems, recovered, duplicatesSuppressed }
```

Idempotency keys ensure duplicate processing is suppressed. If an item has exhausted its retry attempts, it remains in `failed` status for manual investigation.

### Alerting

Configure an alert on queue depth exceeding 70% of max (warning) or 100% (critical) via the `queue` health check.

---

## Circuit Breaker Management

### Circuit states (3)

| State | Behavior |
|-------|----------|
| `closed` | Requests flow normally. Failures are counted. |
| `open` | Requests fail immediately (fast-fail). No calls are made to the dependency. |
| `half_open` | A limited number of test requests are allowed to probe recovery. |

### Configuration

```typescript
const config = createCircuitBreakerConfig('github-connector', {
  failureThreshold: 5,                    // consecutive failures to trip
  failurePercentageThreshold: 50,         // optional: trip at 50% failure rate
  resetTimeoutMs: 30_000,                 // time before half-open probe
  halfOpenMaxCalls: 3,                    // test calls in half-open
});
```

### Monitoring

```typescript
// Get state of a specific circuit breaker
const state = resilience.getCircuitBreakerState('github-connector');
// 'closed' | 'open' | 'half_open'

// List all circuit breakers with health
const breakers = resilience.listCircuitBreakers();
// [{ name, state, healthy: state === 'closed', ... }]
```

### Action on open breaker

1. Identify the failing dependency (connector name, external service).
2. Check the dependency's status page or health endpoint.
3. If the dependency is down, wait for it to recover — the breaker will transition to `half_open` after `resetTimeoutMs`.
4. If the dependency is up but the breaker is stuck open, manually reset it after confirming the dependency is healthy.

---

## Failover Procedures

### Instance statuses (4)

`active`, `standby`, `failed`, `recovering`.

### Load balancing strategies (3)

| Strategy | Description |
|----------|-------------|
| `priority` | Always use the highest-priority healthy instance |
| `round_robin` | Distribute across healthy instances in rotation |
| `least_load` | Route to the instance with the lowest current load |

### Failover process

```typescript
// Get the active instance
const active = resilience.failover.getActiveInstance();

// Mark an instance as failed (triggers failover)
resilience.failover.markFailed('instance-1');

// The failover manager automatically promotes the next healthy instance
const event = resilience.failover.failover('manual failover: host unreachable');
// event: { fromInstanceId, toInstanceId, reason, timestamp }

// Mark an instance as recovered
resilience.failover.markRecovered('instance-1');
```

### Failover events

Every failover is recorded as a `FailoverEvent` with the source, target, reason, and timestamp. Review these events during post-incident analysis.

---

## Disaster Recovery Execution

### Configuration

```typescript
const drConfig: DisasterRecoveryConfig = {
  rpoSeconds: 300,        // Recovery Point Objective: max 5 min data loss
  rtoSeconds: 1800,       // Recovery Time Objective: max 30 min downtime
  mode: 'automatic',      // or 'manual'
  backupIntervalMs: 3600000,  // hourly backups
  maxBackups: 24,
};
```

### Recovery modes (2)

| Mode | Description |
|------|-------------|
| `automatic` | DR plan executes automatically when a failure is detected |
| `manual` | Operator must trigger the plan execution |

### Creating and executing a plan

```typescript
// Create a recovery plan
const plan = resilience.disasterRecovery.createPlan(drConfig);
// plan: { id, rpoSeconds, rtoSeconds, mode, steps[], estimatedRecoveryTimeMs }

// Validate the plan
const valid = resilience.disasterRecovery.validatePlan(plan.id);

// Execute the plan
const result = resilience.disasterRecovery.executePlan(plan.id);
// result: { success, recoveryTimeMs, stepsCompleted, dataLossSeconds }
```

### DR drill

Run chaos testing to validate resilience:

| Scenario type | What it simulates |
|---------------|-------------------|
| `connector_failure` | External service becomes unavailable |
| `memory_pressure` | Memory exhaustion under load |
| `agent_timeout` | Agent stops responding |
| `data_corruption` | Data integrity compromised |
| `high_latency` | Network latency spikes |
| `service_interruption` | Complete service outage |

Review the generated resilience report. If recovery times exceed RTO, tune failover thresholds, reset timeouts, and backup intervals.

---

## Performance Monitoring

### Key metrics to watch

| Metric | Alert threshold |
|--------|----------------|
| `request.latency` (p95) | > 500ms → `high_latency` alert |
| `request.errors` (rate) | > 5% → `repetitive_errors` alert |
| `system.memory_usage` | > 75% warning, > 90% critical |
| `system.cpu_usage` | > 80% warning |
| `system.availability` | < 99.9% → investigate |
| `cost.per_operation` | Anomaly detected → `excessive_consumption` alert |

### AIOps anomaly detection (7 types)

The AIOps engine uses statistical methods (z-score, linear regression) to detect anomalies:

| Anomaly type | Detection method |
|--------------|-----------------|
| `latency_spike` | Z-score > threshold on latency metric |
| `error_burst` | Error count exceeds expected range |
| `progressive_degradation` | Linear regression shows declining performance |
| `cost_growth_anomaly` | Cost trend exceeds expected growth |
| `agent_blocked` | Agent in blocked state longer than expected |
| `skill_unstable` | Skill failure rate above threshold |
| `throughput_drop` | Throughput falls below expected baseline |

### Distributed tracing

Every request is traced with parent-child span linking. Use `meta.correlationId` to follow a request across components. Traces can be exported in OpenTelemetry format for Jaeger, Zipkin, or Datadog APM.

### Performance baseline

The platform includes a performance baseline benchmark (see `docs/hardening/performance-baseline.md`). Compare current metrics against the baseline to detect regressions. If latency or throughput deviates significantly, investigate recent changes and run the chaos test suite to identify bottlenecks.
