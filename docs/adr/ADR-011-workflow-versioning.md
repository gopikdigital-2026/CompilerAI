# ADR-011: Workflow Versioning

## Context
Workflow definitions evolve over time. Running executions must use the version they started with, not the latest.

## Decision
Workflows are versioned via `version: string` field. `WorkflowApplicationService` maintains `activeVersions` map. When a new version is created, the old version remains available for running executions. `nextVersion()` utility increments semver.

## Alternatives
- **No versioning (always latest)**: Rejected — breaks running executions
- **External version control (git)**: Rejected — too heavy for runtime use

## Consequences
- `WorkflowDefinition` includes `version` and `workflowId`
- Multiple versions can coexist for the same workflow
- `createVersion()` creates a new version without affecting existing ones
- Checkpoints reference the specific version they were created with
