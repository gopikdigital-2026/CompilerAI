# Runtime Flow

## Full Pipeline Flow

```
HTTP Request
    │
    ▼
Platform API (InMemoryHttpAdapter)
    │
    ├── Authentication Middleware → Principal
    ├── Authorization Middleware → Permission check
    ├── Organization Context Middleware → Org scoping
    ├── Idempotency Check → Duplicate?
    │       └── Yes → Return cached result
    │       └── No → Continue
    │
    ▼
Controller (ExecutionController)
    │
    ▼
ApplicationService (ExecutionApplicationService)
    │
    ▼
CompilerRuntime.execute(RuntimeRequest)
    │
    ├── RuntimeRequestValidator → Validate
    ├── IdempotencyKey check → Duplicate?
    │       └── Yes → throw IdempotencyDuplicateError
    │       └── No → Continue
    │
    ▼
RuntimeCoordinator.execute()
    │
    ├── Create RuntimeExecution (status: RUNNING)
    ├── Build WorkflowDefinition
    ├── Schedule workflow nodes
    │
    ▼
Orchestrator.execute(CompilerIntelligenceRequest)
    │
    ├── Stage 1: CONTEXT
    │     └── ContextIntelligenceService.analyze()
    │         ├── ContextAnalyzer → BusinessContext
    │         ├── ContextEnricher → + Memory, Sources
    │         └── ContextValidator → Sufficiency score
    │
    ├── Stage 2: INTENT
    │     └── IntentEngine.resolve(contextResult)
    │         ├── IntentClassifier → Category, Area
    │         └── IntentValidator → Contradictions, gaps
    │
    ├── Stage 3: PLANNING
    │     └── PlanningEngine.plan(intentResult)
    │         ├── PlanGenerator → ExecutionPlan
    │         ├── ExecutionGraphBuilder → DAG
    │         └── PlanValidator → Valid?
    │
    ├── Stage 4: DECISION
    │     └── DecisionEngine.decide(decisionRequest)
    │         ├── DecisionExtractor → Extract decisions from plan
    │         ├── AlternativeGenerator → Generate alternatives
    │         ├── AlternativeEvaluator → Rank alternatives
    │         └── ConflictDetector → Detect conflicts
    │
    ├── Stage 5: CONFIDENCE
    │     └── ConfidenceEngine.evaluate(confidenceRequest)
    │         ├── ConfidenceCalculator → Score (0-100)
    │         ├── UncertaintyAnalyzer → Uncertainties
    │         ├── EvidenceEvaluator → Evidence
    │         └── ConfidenceValidator → Block/escalate?
    │
    ├── Post-pipeline side effects (fire-and-forget):
    │     ├── Memory.write() → Persist execution memory
    │     ├── Tools.selectTools() → Select tools
    │     │     └── Execution.execute() → Run tools (if READY)
    │     └── Learning.learn() → Extract patterns
    │
    └── Telemetry: startExecution, recordStageStart/Complete/Failure, finalizeExecution
    │
    ▼
WorkflowRunner.run()
    │
    ├── For each node (in DAG order):
    │     ├── Check approval requirement
    │     │     └── If required → Create ApprovalRequest → PAUSE
    │     ├── Execute node
    │     ├── Save checkpoint
    │     └── Record event
    │
    ▼
RuntimeResultBuilder.build()
    │
    ▼
HTTP Response (JSON)
```

## Resume Flow

```
ResumeToken → RuntimeCoordinator.resume()
    ├── Validate token (not expired, not consumed)
    ├── Load checkpoint
    ├── Rebuild WorkflowExecution from checkpoint
    ├── Orchestrator.execute(resumeFrom: <stage>)
    └── WorkflowRunner.resume()
```

## Cancel Flow

```
CancelRequest → RuntimeCoordinator.cancel()
    ├── Set status: CANCELLED
    ├── WorkflowCancellationManager.cancel()
    │     └── Cancel running steps
    └── Return RuntimeResult (status: CANCELLED)
```
