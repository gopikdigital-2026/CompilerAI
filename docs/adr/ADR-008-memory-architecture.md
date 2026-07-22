# ADR-008: Memory Architecture

## Context
The intelligence pipeline needs to persist and retrieve organizational memory (execution outcomes, patterns, semantic knowledge) across runs.

## Decision
Implement a dedicated Memory Intelligence Engine with:
- **Types**: EXECUTION, SESSION, ORGANIZATION, SEMANTIC, WORKING
- **Sensitivity levels**: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
- **Consent enforcement**: `enforceConsent()` blocks writes without consent
- **TTL**: Configurable per-entry expiry
- **Consolidation**: Short-term → long-term promotion
- **Deduplication**: Content hash prevents duplicate entries

## Alternatives
- **No memory (stateless)**: Rejected — pipeline cannot learn from past executions
- **External vector DB**: Rejected — premature, adds infrastructure complexity

## Consequences
- Memory entries are org-scoped with sensitivity enforcement
- Expired entries excluded from queries unless explicitly requested
- Fire-and-forget writes in orchestrator don't block the pipeline
- `SensitiveDataBlockedError` on policy violations
