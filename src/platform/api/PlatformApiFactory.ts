// ─── Platform API factory ───────────────────────────────────────────────────────
// Wires all components together and returns a ready-to-use HTTP adapter.

import { CompilerRuntime } from '../../compiler/runtime/services/CompilerRuntime';
import { CompilerIntelligenceOrchestrator } from '../../compiler/core/intelligence/orchestrator/services/CompilerIntelligenceOrchestrator';
import { RouteRegistry } from './routes/RouteRegistry';
import { InMemoryHttpAdapter } from './routes/InMemoryHttpAdapter';
import { registerRoutes } from './routes/RouteRegistration';
import { SimulatedAuthenticationProvider } from './auth/AuthInterfaces';
import { InMemoryIdempotencyRepository, IdempotencyService } from './services/IdempotencyService';
import { InMemoryRateLimiter } from './middleware/RateLimitMiddleware';
import {
  ExecutionApplicationService, WorkflowApplicationService,
  ApprovalApplicationService, TelemetryApplicationService, CapabilityApplicationService,
} from './services/ApplicationServices';
import {
  ExecutionController, WorkflowController, ApprovalController,
  TelemetryController, CapabilityController, HealthController,
} from './controllers/Controllers';
import type { IHttpAdapter } from './interfaces/HttpInterfaces';

export interface PlatformApiConfig {
  clock:           () => string;
  idGenerator:     () => string;
  rateLimitPerOrg: number;
  rateLimitWindowMs: number;
}

export function createPlatformApi(
  runtime: CompilerRuntime,
  authProvider: SimulatedAuthenticationProvider,
  config: PlatformApiConfig,
): IHttpAdapter {
  const registry = new RouteRegistry();
  const idempotencyRepo = new InMemoryIdempotencyRepository(() => new Date(config.clock()).getTime());
  const idempotency = new IdempotencyService(idempotencyRepo, config.clock);
  const rateLimiter = new InMemoryRateLimiter();

  const execService = new ExecutionApplicationService(runtime, config.idGenerator, config.clock);
  const wfService = new WorkflowApplicationService(config.idGenerator, config.clock);
  const approvalService = new ApprovalApplicationService(runtime, config.idGenerator);
  const telemetryService = new TelemetryApplicationService(runtime);
  const capabilityService = new CapabilityApplicationService();

  const controllers = {
    execution: new ExecutionController(execService),
    workflow: new WorkflowController(wfService),
    approval: new ApprovalController(approvalService),
    telemetry: new TelemetryController(telemetryService),
    capability: new CapabilityController(capabilityService),
    health: new HealthController(),
  };

  registerRoutes(registry, controllers);

  return new InMemoryHttpAdapter({
    routes: registry,
    authProvider,
    idempotency,
    rateLimiter,
    clock: config.clock,
    idGenerator: config.idGenerator,
    rateLimitPerOrg: config.rateLimitPerOrg,
    rateLimitWindowMs: config.rateLimitWindowMs,
  });
}

export function createDefaultRuntime(idGenerator: () => string, clock: () => string): CompilerRuntime {
  const orchestrator = new CompilerIntelligenceOrchestrator({
    idGenerator, clock, factorWeights: {},
  });
  return new CompilerRuntime({
    idGenerator, clock, orchestrator,
    telemetry: null, memory: null, tools: null, execution: null, learning: null,
  });
}
