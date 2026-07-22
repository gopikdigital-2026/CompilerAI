# Data Flow

## Request Data Flow

```
User Prompt (string)
    │
    ▼
ContextRequest { requestId, prompt, organizationId, userId, locale, receivedAt }
    │
    ▼
ContextAnalyzer → BusinessContext { objectives, constraints, entities, urgency }
    │
    ▼ (+ EnterpriseMemorySnapshot)
ContextEnricher → ContextEnrichment { relevantMemory, recommendedSources }
    │
    ▼
ContextValidator → ContextResult { status, sufficiencyScore, gaps }
    │
    ▼
IntentEngine → IntentResult { primaryIntent, category, area, complexity, urgency }
    │
    ▼
PlanningEngine → ExecutionPlan { planId, graph: { nodes, edges }, risks, approvals }
    │
    ▼
DecisionEngine → DecisionResult { decisions, alternatives, conflicts, rationale }
    │
    ▼
ConfidenceEngine → ConfidenceResult { overallScore, level, uncertainties, evidence }
    │
    ▼
CompilerIntelligenceResult { all results + trace + status }
    │
    ├── → Memory.write() → MemoryEntry persisted
    ├── → Tools.selectTools() → ToolExecutionPlan
    │     └── → Execution.execute() → ExecutionResult { stepResults }
    └── → Learning.learn() → LearningRecord persisted
```

## Persistence Data Flow

```
Domain Entity
    │
    ▼
DomainMapper.toRow(entity) → SchemaRow
    │
    ▼
PostgresRepository.save(row) → Supabase table
    │
    ▼ (async via Outbox)
OutboxManager.publish(event) → OutboxEvent
    │
    ▼
OutboxProcessor.process() → External handler
```

## Read Data Flow

```
HTTP Request
    │
    ▼
Controller → ApplicationService → Repository.findById()
    │
    ▼
SupabaseClient.query(sql, params) → SchemaRow
    │
    ▼
DomainMapper.toDomain(row) → Domain Entity
    │
    ▼
DtoMapper.toDto(entity) → ResponseDTO
    │
    ▼
JSON Response
```

## Multitenancy Data Isolation

All data is scoped by `organization_id`:

1. **Row-level**: Every table has `organization_id` column with RLS policies
2. **Query-level**: `findByOrganization(orgId)` filters by org
3. **API-level**: OrganizationContextMiddleware sets org context
4. **Authorization-level**: AuthorizationService checks org membership
5. **Repository-level**: IOrgScopedRepository enforces org scoping
