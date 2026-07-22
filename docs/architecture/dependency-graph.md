# Dependency Graph

```mermaid
graph TD
  subgraph Frontend
    UI[React SPA]
  end

  subgraph "Platform API"
    HTTP[InMemoryHttpAdapter]
    CTRL[Controllers]
    APPSVC[ApplicationServices]
    IDEM[IdempotencyService]
    RL[RateLimiter]
  end

  subgraph "Identity"
    AUTH[Auth Providers]
    AUTHZ[AuthorizationService]
    ORGSVC[OrganizationService]
    USERSVC[UserService]
    APIKEYSVC[ApiKeyService]
    SESSMGR[SessionManager]
  end

  subgraph "Bootstrap"
    AC[ApplicationContainer]
    DR[DependencyRegistry]
  end

  subgraph "Shared Contracts"
    IDS[IdGenerator / Clock]
    ERR[DomainError]
    EVT[EventPublisher]
    REPO[IRepository]
  end

  subgraph "Compiler Runtime"
    RT[CompilerRuntime]
    COORD[RuntimeCoordinator]
    WFE[WorkflowEngine]
    WFR[WorkflowRunner]
    APRV[ApprovalManager]
    CHKP[CheckpointStore]
    EBUS[RuntimeEventBus]
  end

  subgraph "Intelligence Pipeline"
    ORC[Orchestrator]
    CTX[Context Intelligence]
    INT[Intent Engine]
    PLN[Planning Engine]
    DEC[Decision Engine]
    CONF[Confidence Engine]
  end

  subgraph "Cross-cutting"
    TEL[Telemetry]
    MEM[Memory Engine]
    TOOL[Tool Intelligence]
    EXE[Execution Engine]
    LRN[Learning Engine]
  end

  subgraph Infrastructure
    DB[SupabaseClient]
    OUTBOX[OutboxManager]
    CACHE[CacheManager]
    QUEUE[JobQueue]
    LOCKS[DistributedLocks]
    SECRET[SecretManager]
    AUDIT[AuditLog]
  end

  UI --> HTTP
  HTTP --> CTRL
  HTTP --> AUTH
  HTTP --> IDEM
  HTTP --> RL
  CTRL --> APPSVC
  APPSVC --> RT
  APPSVC --> AUTHZ

  AC --> ORC
  AC --> RT
  AC --> TEL
  AC --> MEM
  AC --> TOOL
  AC --> EXE
  AC --> LRN
  AC --> DR
  DR --> IDS

  RT --> COORD
  COORD --> ORC
  COORD --> WFE
  COORD --> WFR
  COORD --> APRV
  COORD --> CHKP
  COORD --> EBUS
  COORD --> TEL

  ORC --> CTX
  ORC --> INT
  ORC --> PLN
  ORC --> DEC
  ORC --> CONF
  ORC --> TEL
  ORC --> MEM
  ORC --> TOOL
  ORC --> EXE
  ORC --> LRN

  CTX --> MEM
  INT --> CTX
  PLN --> INT
  DEC --> PLN
  CONF --> CTX
  CONF --> INT
  CONF --> PLN
  CONF --> DEC

  EXE --> TEL
  LRN --> TEL
  LRN --> MEM

  ORGSVC --> DB
  USERSVC --> DB
  APIKEYSVC --> DB
  SESSMGR --> DB
  AUDIT --> DB
```

## Dependency Rules

1. **Downward only**: Higher layers depend on lower layers, never reverse
2. **No circular imports**: Verified by typecheck
3. **Interfaces over classes**: All cross-module dependencies are interface-based
4. **Bootstrap is the only wiring point**: No direct `new` outside bootstrap (except orchestrator's internal engines — known tech debt)
