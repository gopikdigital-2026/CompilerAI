# ADR-014: Telemetry

## Context
The pipeline needs traceable, explainable execution records for debugging, auditing, and performance monitoring.

## Decision
Implement a Telemetry Engine with:
- **ExecutionTrace**: Per-request trace with stage-level entries
- **StageTrace**: Start/complete/fail events per pipeline stage
- **TelemetryMetrics**: Aggregate metrics (count, latency, success rate)
- **ExplainabilityRecord**: Human-readable explanation of decisions
- **TelemetryEventBus**: Event bus for telemetry-specific events
- **PerformanceSnapshot**: Point-in-time performance capture

## Alternatives
- **No telemetry**: Rejected — no observability, no debugging
- **External APM only**: Rejected — doesn't capture domain-specific trace

## Consequences
- `ITelemetryEngine` is the most cross-cutting interface (used by Orchestrator, Runtime, Execution, Learning)
- Telemetry events are safe (no prompts, secrets, or PII in payloads)
- `TelemetryEngine` can work with null trace repository (no-op mode)
- Known tech debt: `RuntimeEventBus` hardcodes `'ConfidenceCalculated'` for all forwarded events
