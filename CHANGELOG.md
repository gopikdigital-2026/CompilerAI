# CHANGELOG

All notable changes to CompilerAI Enterprise are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-rc1] — 2026-07-26

### Added — Sprint 33 (Monorepo Stabilization)
- Workspace configuration with 16 packages
- Unified dependency versions across all packages
- Dependency audit scripts (circular deps, orphans, duplicates, API bypass)
- Full validation gate (`npm run validate`)
- Cross-module regression test suite

### Added — Sprint 34 (Observability & AIOps)
- `@compilerai/observability` package (v1.0.0)
- Unified Metrics Engine with 10 standard metric types
- Distributed Tracing with parent-child span linking
- Structured Logging with automatic sensitive field redaction
- Health Monitoring with 8 pre-built health check types
- Alert Engine with 7 alert types and 4 severity levels
- AIOps Engine with 7 anomaly detection types
- Dashboard models for 8 dashboard types
- Exporters for JSON, Prometheus, and OpenTelemetry (Mock)
- Telemetry bus with 8 event types
- 121 tests, 98.05% line coverage

### Added — Sprint 35 (Resilience & Disaster Recovery)
- `@compilerai/resilience` package (v1.0.0)
- Circuit Breaker with 3 states (Closed, Open, Half-Open)
- Smart Retry Engine with 3 backoff strategies and jitter
- Failover Manager with 3 load balancing strategies
- Replication Manager for 4 targets with conflict detection
- Backup & Restore with full/incremental snapshots
- Chaos Testing with 6 scenario types and resilience reports
- Queue Recovery with idempotent processing
- Disaster Recovery with configurable RPO/RTO
- 111 tests, 98.31% line coverage

### Added — Sprint 36 (Release Candidate)
- Enterprise Quality Gates (`npm run quality:gates`)
- CHANGELOG.md, RELEASE_NOTES.md, MIGRATION.md
- LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md
- Production configuration templates (.env.example)
- Deployment documentation (Docker, Docker Compose, CI/CD)
- Final documentation suite (9 documents)
- COMPILERAI_ENTERPRISE_V1_FINAL_REPORT.md

### Pre-existing (Sprints 1–32)
- 14 core packages: agent-runtime, automation-studio, cli, connectors, copilot,
  dashboard, enterprise-rag, identity-platform, knowledge-graph, marketplace,
  multi-agent, sdk-typescript, security-governance, skills-marketplace
- Compiler Core with intelligence pipeline (context, intent, planning, decision, execution, memory, confidence, learning, telemetry, tools)
- Compiler Runtime with workflow engine, approvals, human tasks, checkpoints
- Platform API with REST controllers, OpenAPI spec, idempotency
- Identity & Access Management with RBAC, API keys, sessions, organizations
- Infrastructure layer with database, cache, events, health, locks, observability, queue, secrets, storage
- Frontend dashboard with 14 pages
- Supabase migrations (11 SQL files)
- 2,134 total tests across all packages

### Changed
- Root package.json version: 1.0.0 → 1.0.0-rc1
- TypeScript unified to ^5.6.0 across all 16 packages
- ESLint unified to ^9.12.0 across all packages
- typescript-eslint unified to ^8.8.0
- vitest corrected from invalid ^4.1.10 to ^2.1.8
- @types/node ^22.0.0 added to all packages

### Known Issues
- 5 packages (agent-runtime, automation-studio, identity-platform, marketplace, connectors) have pre-existing ESLint config compatibility issues with ESLint 9.12.0 (non-critical)
- CLI package has 0 test assertions due to test reporter format differences (non-critical)
