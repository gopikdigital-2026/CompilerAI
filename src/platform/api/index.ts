// ─── Platform API — public API barrel ───────────────────────────────────────────

// ── HTTP adapter ──────────────────────────────────────────────────────────────
export { InMemoryHttpAdapter } from './routes/InMemoryHttpAdapter';
export type { InMemoryHttpAdapterDeps } from './routes/InMemoryHttpAdapter';
export { RouteRegistry } from './routes/RouteRegistry';
export { registerRoutes } from './routes/RouteRegistration';

// ── Interfaces ──────────────────────────────────────────────────────────────────
export type { HttpRequest, HttpResponse, HttpHandler, RequestContext, IRouteRegistry, IHttpAdapter } from './interfaces/HttpInterfaces';

// ── Auth ────────────────────────────────────────────────────────────────────────
export {
  SimulatedAuthenticationProvider, SimulatedApiKeyValidator, SimulatedTokenValidator,
  ROLE_PERMISSIONS, ALL_PERMISSIONS,
} from './auth/AuthInterfaces';
export type {
  AuthenticatedPrincipal, IAuthenticationProvider, IApiKeyValidator, ITokenValidator, ApiRole,
} from './auth/AuthInterfaces';

// ── DTOs ────────────────────────────────────────────────────────────────────────
export type {
  CreateExecutionRequestDto, ExecutionResponseDto, ExecutionResultResponseDto,
  PauseExecutionRequestDto, ResumeExecutionRequestDto, CancelExecutionRequestDto,
  CreateWorkflowRequestDto, WorkflowResponseDto, WorkflowValidationResponseDto,
  ApprovalResponseDto, ApprovalDecisionRequestDto,
  TelemetryEventResponseDto, ExecutionTraceResponseDto,
  ApiErrorResponseDto, PaginationRequestDto, PaginatedResponseDto,
  ApiMetaDto, ApiSuccessResponseDto,
  CapabilityResponseDto, HealthResponseDto, ReadinessResponseDto, VersionResponseDto,
} from './dto/ApiDtos';

// ── Error codes ──────────────────────────────────────────────────────────────────
export type { ApiErrorCode, ApiErrorDef } from './errors/ApiErrorCodes';
export { getErrorDef, getHttpStatus, isRetryable } from './errors/ApiErrorCodes';

// ── Services ─────────────────────────────────────────────────────────────────────
export {
  ExecutionApplicationService, WorkflowApplicationService,
  ApprovalApplicationService, TelemetryApplicationService, CapabilityApplicationService,
} from './services/ApplicationServices';
export { IdempotencyService } from './services/IdempotencyService';
export type { IIdempotencyRepository, IdempotencyRecord } from './services/IdempotencyService';
export { InMemoryIdempotencyRepository } from './services/IdempotencyService';
export { ok, created, accepted, noContent, paginated, apiError, notFound, validationError } from './services/ResponseHelpers';

// ── Middleware ───────────────────────────────────────────────────────────────────
export { InMemoryRateLimiter } from './middleware/RateLimitMiddleware';
export type { IRateLimiter } from './middleware/RateLimitMiddleware';

// ── Controllers ──────────────────────────────────────────────────────────────────
export {
  ExecutionController, WorkflowController, ApprovalController,
  TelemetryController, CapabilityController, HealthController,
} from './controllers/Controllers';

// ── Validators ───────────────────────────────────────────────────────────────────
export {
  ExecutionRequestValidator, WorkflowRequestValidator,
  ApprovalRequestValidator, PaginationValidator,
} from './validation/RequestValidators';

// ── Mappers ──────────────────────────────────────────────────────────────────────
export { ExecutionMapper, WorkflowMapper, ApprovalMapper, TelemetryMapper, ErrorMapper } from './mappers/DomainMappers';

// ── Platform API factory ─────────────────────────────────────────────────────────
export { createPlatformApi, createDefaultRuntime } from './PlatformApiFactory';
export type { PlatformApiConfig } from './PlatformApiFactory';
export { getOpenApiSpec } from './openapi/OpenApiSpec';
