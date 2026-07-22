# Module Map

| Module | Path | Key Exports |
|--------|------|-------------|
| Shared Contracts | `src/shared/contracts/` | IdGenerator, Clock, DomainError, BaseEvent, IRepository |
| Bootstrap | `src/bootstrap/` | ApplicationContainer, createApplication, createTestApplication |
| Context Intelligence | `src/compiler/core/intelligence/context/` | ContextAnalyzer, ContextEnricher, ContextValidator |
| Intent Engine | `src/compiler/core/intelligence/intent/` | IntentEngine, IntentClassifier, IntentValidator |
| Planning Engine | `src/compiler/core/intelligence/planning/` | PlanningEngine, PlanGenerator, PlanValidator |
| Decision Engine | `src/compiler/core/intelligence/decision/` | DecisionEngine, AlternativeEvaluator, ConflictDetector |
| Confidence Engine | `src/compiler/core/intelligence/confidence/` | ConfidenceEngine, ConfidenceCalculator |
| Orchestrator | `src/compiler/core/intelligence/orchestrator/` | CompilerIntelligenceOrchestrator |
| Telemetry | `src/compiler/core/intelligence/telemetry/` | TelemetryEngine, TelemetryEventBus, MetricsCollector |
| Memory Intelligence | `src/compiler/core/intelligence/memory/` | MemoryEngine, InMemoryMemoryRepository |
| Tool Intelligence | `src/compiler/core/intelligence/tools/` | ToolIntelligenceEngine, ToolRegistry |
| Execution Engine | `src/compiler/core/intelligence/execution/` | ExecutionEngine, SimulatedToolAdapter |
| Learning Engine | `src/compiler/core/intelligence/learning/` | LearningEngine, InMemoryLearningRepository |
| Compiler Runtime | `src/compiler/runtime/` | CompilerRuntime, RuntimeCoordinator |
| Workflow Engine | `src/compiler/runtime/workflow/` | WorkflowEngine, WorkflowRunner, WorkflowScheduler |
| Platform API | `src/platform/api/` | InMemoryHttpAdapter, RouteRegistry, Controllers |
| Identity | `src/platform/identity/` | AuthorizationService, OrganizationService, UserService |
| Infrastructure | `src/infrastructure/` | SupabaseDatabaseClient, OutboxManager, CacheManager |
| Frontend | `src/pages/`, `src/components/` | React SPA |
