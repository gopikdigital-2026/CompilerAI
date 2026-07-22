# ADR-006: Repository Pattern

## Context
5+ repository interfaces had the same CRUD shape (`save/findById/findByOrganization/update/delete/count/clear`). In-memory implementations copy-pasted org-indexing logic.

## Decision
Define `IRepository<T>` and `IOrgScopedRepository<T>` in `shared/contracts/Repository.ts`. Provide `InMemoryOrgScopedRepository<T>` base class with org-indexing built in. New repositories extend these contracts.

## Alternatives
- **ActiveRecord pattern**: Rejected — couples domain to persistence
- **Keep per-module interfaces**: Rejected — duplication, no shared abstraction

## Consequences
- Consistent repository interface across modules
- Org-indexing handled once in base class
- Existing interfaces remain compatible (structural typing)
- Gradual adoption — existing repos not forced to migrate
