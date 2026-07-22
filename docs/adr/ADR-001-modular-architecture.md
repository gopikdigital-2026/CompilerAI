# ADR-001: Modular Architecture

## Context
CompilerAI needs to support multiple intelligence engines, a runtime, a platform API, and infrastructure — all evolving independently.

## Decision
Adopt a modular monolith with strict layer boundaries. Each module has: `interfaces/`, `models/`, `services/`, `errors/`, `rules/` (or `policies/`), `tests/`, and a barrel `index.ts`.

## Alternatives
- **Microservices**: Rejected — premature for current scale, adds network complexity
- **Single-layer monolith**: Rejected — poor separation of concerns, hard to test

## Consequences
- Clear ownership boundaries
- Each module testable in isolation
- Barrel files provide clean public APIs
- Some duplication of structural patterns (interfaces/models/services) across modules
