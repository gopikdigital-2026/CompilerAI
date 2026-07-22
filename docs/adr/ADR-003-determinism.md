# ADR-003: Determinism

## Context
Tests need reproducible results. Non-deterministic clocks (`new Date()`) and random IDs (`Math.random()`) make assertions impossible.

## Decision
All time and ID generation goes through injected functions. `createDeterministicClock(startMs, stepMs)` produces ISO timestamps incremented by 1s. `createDeterministicIdGenerator(prefix)` produces `prefix_000001`, `prefix_000002`, etc. `createTestApplication()` wires both for tests.

## Alternatives
- **Mock Date globally**: Rejected — fragile, affects unrelated code
- **Accept non-determinism**: Rejected — cannot verify correctness

## Consequences
- Same inputs always produce same outputs (structural equality)
- E2E test verifies determinism by running the pipeline twice and comparing
- Production uses `createSystemClock()` and random ID generators
