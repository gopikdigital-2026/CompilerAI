# ADR-002: Dependency Injection

## Context
Services were directly instantiating their dependencies (`new IntentEngine()` inside Orchestrator), making testing and substitution difficult.

## Decision
Introduce a composition root (`src/bootstrap/ApplicationContainer.ts`) that wires all dependencies. All engines receive their dependencies via constructor params. Shared contracts define `IdGenerator`, `Clock`, `ClockWithMath` types.

## Alternatives
- **Service locator**: Rejected — hides dependencies, hard to test
- **No DI (status quo)**: Rejected — cannot inject mocks, cannot swap implementations

## Consequences
- Single wiring point in bootstrap
- `createTestApplication()` provides deterministic test fixtures
- Engines remain unaware of each other's concrete implementations
- Known tech debt: Orchestrator still instantiates 5 internal engines directly
