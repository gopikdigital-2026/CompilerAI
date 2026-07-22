import type { ICompilerIntelligenceOrchestrator } from '../compiler/core/intelligence/orchestrator/interfaces/ICompilerIntelligenceOrchestrator';
import type { ITelemetryEngine } from '../compiler/core/intelligence/telemetry/interfaces/ITelemetryEngine';
import type { IMemoryEngine } from '../compiler/core/intelligence/memory/interfaces/IMemoryEngine';
import type { IToolIntelligenceEngine } from '../compiler/core/intelligence/tools/interfaces/IToolIntelligenceEngine';
import type { IExecutionEngine } from '../compiler/core/intelligence/execution/interfaces/IExecutionEngine';
import type { ILearningEngine } from '../compiler/core/intelligence/learning/interfaces/ILearningEngine';
import type { CompilerRuntime } from '../compiler/runtime/services/CompilerRuntime';

import {
  CompilerIntelligenceOrchestrator,
  TelemetryEngine,
  MemoryEngine,
  InMemoryMemoryRepository,
  ToolIntelligenceEngine,
  ToolRegistry,
  ExecutionEngine,
  SimulatedToolAdapter,
  LearningEngine,
  InMemoryLearningRepository,
} from '../compiler/core/index';
import { CompilerRuntime as CompilerRuntimeImpl } from '../compiler/runtime/services/CompilerRuntime';
import { InMemoryEventPublisher } from '../shared/contracts/EventPublisher';
import { createDeterministicClock, createSystemClock } from '../shared/contracts/Clock';
import { createDependencyRegistry } from './DependencyRegistry';
import type { DependencyRegistry as IRegistry } from './DependencyRegistry';

export interface ApplicationContainer {
  readonly registry: IRegistry;
  readonly orchestrator: ICompilerIntelligenceOrchestrator;
  readonly telemetry: ITelemetryEngine;
  readonly memory: IMemoryEngine;
  readonly tools: IToolIntelligenceEngine;
  readonly execution: IExecutionEngine;
  readonly learning: ILearningEngine;
  readonly runtime: CompilerRuntime;
}

function createDefaultIdGenerator(): () => string {
  let counter = 0;
  return () => `id_${++counter}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDeterministicIdGenerator(prefix: string = 'id'): () => string {
  let counter = 0;
  return () => `${prefix}_${String(++counter).padStart(6, '0')}`;
}

export function createApplication(config?: {
  deterministic?: boolean;
  startEpochMs?: number;
  configuration?: Record<string, unknown>;
}): ApplicationContainer {
  const clock = config?.deterministic
    ? createDeterministicClock(config?.startEpochMs ?? 1_700_000_000_000, 1000)
    : createSystemClock();
  const idGenerator = config?.deterministic
    ? createDeterministicIdGenerator()
    : createDefaultIdGenerator();
  const eventPublisher = new InMemoryEventPublisher();
  const registry = createDependencyRegistry(idGenerator, clock, eventPublisher, config?.configuration);

  const telemetry = new TelemetryEngine({
    idGenerator: registry.idGenerator,
    clock: registry.clock,
  });

  const memoryRepo = new InMemoryMemoryRepository();
  const memory = new MemoryEngine({
    idGenerator: registry.idGenerator,
    clock: registry.clock,
    repository: memoryRepo,
  });

  const toolRegistry = new ToolRegistry();
  const tools = new ToolIntelligenceEngine({
    idGenerator: registry.idGenerator,
    clock: registry.clock,
    registry: toolRegistry,
  });

  const toolAdapter = new SimulatedToolAdapter(registry.idGenerator, registry.clock);
  const execution = new ExecutionEngine({
    idGenerator: registry.idGenerator,
    clock: registry.clock,
    telemetry,
    memory,
  });
  void toolAdapter;

  const learningRepo = new InMemoryLearningRepository();
  const learning = new LearningEngine({
    idGenerator: registry.idGenerator,
    clock: registry.clock,
    telemetry,
    memory,
  });
  void learningRepo;

  const orchestrator = new CompilerIntelligenceOrchestrator({
    idGenerator: registry.idGenerator,
    clock: registry.clock,
    factorWeights: {},
    telemetry,
    memory,
    tools,
    execution,
    learning,
  });

  const runtime = new CompilerRuntimeImpl({
    idGenerator: registry.idGenerator,
    clock: registry.clock,
    orchestrator,
    telemetry,
    memory,
    tools,
    execution,
    learning,
  });

  return { registry, orchestrator, telemetry, memory, tools, execution, learning, runtime };
}

export function createTestApplication(): ApplicationContainer {
  return createApplication({ deterministic: true });
}
