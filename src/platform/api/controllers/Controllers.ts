// ─── API Controllers ────────────────────────────────────────────────────────────
// Thin HTTP handlers — no business logic. Delegate to application services.

import type { HttpHandler, HttpRequest, RequestContext, HttpResponse } from '../interfaces/HttpInterfaces';
import type { ExecutionApplicationService } from '../services/ApplicationServices';
import type { WorkflowApplicationService } from '../services/ApplicationServices';
import type { ApprovalApplicationService } from '../services/ApplicationServices';
import type { TelemetryApplicationService } from '../services/ApplicationServices';
import type { CapabilityApplicationService } from '../services/ApplicationServices';
import { ok, created, accepted, apiError, paginated, validationError } from '../services/ResponseHelpers';
import { getOpenApiSpec } from '../openapi/OpenApiSpec';
import { ExecutionMapper, WorkflowMapper, ApprovalMapper, TelemetryMapper } from '../mappers/DomainMappers';
import { ExecutionRequestValidator, WorkflowRequestValidator, ApprovalRequestValidator, PaginationValidator } from '../validation/RequestValidators';
import { IdempotencyDuplicateError } from '../../../compiler/runtime/errors/RuntimeErrors';

const BASE = '/api/v1';

function requirePermission(ctx: RequestContext, perm: string): HttpResponse | null {
  if (!ctx.permissions.includes(perm)) {
    return apiError('ACCESS_DENIED', `Missing permission: ${perm}`, 403, ctx);
  }
  return null;
}

function requireOrg(ctx: RequestContext): string {
  if (!ctx.organizationId) throw Object.assign(new Error('No organization context'), { code: 'AUTHENTICATION_REQUIRED', httpStatus: 401 });
  return ctx.organizationId;
}

// ── ExecutionController ─────────────────────────────────────────────────────────

export class ExecutionController {
  constructor(private readonly service: ExecutionApplicationService) {}

  create(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'execution:create');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const validation = ExecutionRequestValidator.validateCreate(req.body);
      if (!validation.valid || !validation.dto) return validationError(validation.errors, ctx);
      try {
        const result = await this.service.createExecution(validation.dto, orgId, ctx.actorId ?? 'unknown');
        return accepted(ExecutionMapper.toResponse(result.execution, `${BASE}/executions`), ctx);
      } catch (err) {
        if (err instanceof IdempotencyDuplicateError) {
          return apiError('IDEMPOTENCY_CONFLICT', 'Duplicate idempotency key.', 409, ctx);
        }
        throw err;
      }
    };
  }

  get(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'execution:read');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const exec = this.service.getExecution(req.params.executionId, orgId);
      if (!exec) return apiError('EXECUTION_NOT_FOUND', 'Execution not found', 404, ctx);
      return ok(ExecutionMapper.toResponse(exec, `${BASE}/executions`), ctx);
    };
  }

  getResult(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'execution:read');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const exec = this.service.getExecution(req.params.executionId, orgId);
      if (!exec) return apiError('EXECUTION_NOT_FOUND', 'Execution not found', 404, ctx);
      return ok(ExecutionMapper.toResultResponse(this.service.getResultFromExecution(exec)), ctx);
    };
  }

  pause(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'execution:pause');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const exec = this.service.getExecution(req.params.executionId, orgId);
      if (!exec) return apiError('EXECUTION_NOT_FOUND', 'Execution not found', 404, ctx);
      const paused = this.service.pause(req.params.executionId);
      if (!paused) return apiError('INVALID_EXECUTION_STATE', 'Cannot pause execution in current state.', 409, ctx);
      return ok(ExecutionMapper.toResponse(exec, `${BASE}/executions`), ctx);
    };
  }

  resume(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'execution:resume');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const exec = this.service.getExecution(req.params.executionId, orgId);
      if (!exec) return apiError('EXECUTION_NOT_FOUND', 'Execution not found', 404, ctx);
      const body = req.body as Record<string, unknown> | null;
      if (!body?.resumeToken || typeof body.resumeToken !== 'string') {
        return validationError(['resumeToken is required.'], ctx);
      }
      try {
        const result = await this.service.resume(body.resumeToken as string);
        return ok(ExecutionMapper.toResponse(result.execution, `${BASE}/executions`), ctx);
      } catch (err) {
        const code = (err as { code?: string }).code ?? 'INVALID_RESUME_TOKEN';
        return apiError(code, (err as Error).message, 409, ctx);
      }
    };
  }

  cancel(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'execution:cancel');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const exec = this.service.getExecution(req.params.executionId, orgId);
      if (!exec) return apiError('EXECUTION_NOT_FOUND', 'Execution not found', 404, ctx);
      const body = req.body as Record<string, unknown> | null;
      const reason = (body?.reason as string) ?? 'No reason provided';
      const result = await this.service.cancel(req.params.executionId, reason);
      if (!result) return apiError('INVALID_EXECUTION_STATE', 'Cannot cancel execution in terminal state.', 409, ctx);
      return ok(ExecutionMapper.toResponse(result.execution, `${BASE}/executions`), ctx);
    };
  }

  getEvents(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'telemetry:read');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const exec = this.service.getExecution(req.params.executionId, orgId);
      if (!exec) return apiError('EXECUTION_NOT_FOUND', 'Execution not found', 404, ctx);
      const events = this.service.getEvents(req.params.executionId);
      return ok(events.map(e => TelemetryMapper.toEventResponse(e)), ctx);
    };
  }

  getTrace(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'telemetry:read');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const exec = this.service.getExecution(req.params.executionId, orgId);
      if (!exec) return apiError('EXECUTION_NOT_FOUND', 'Execution not found', 404, ctx);
      const events = this.service.getEvents(req.params.executionId);
      return ok(TelemetryMapper.toTraceResponse(req.params.executionId, events), ctx);
    };
  }
}

// ── WorkflowController ──────────────────────────────────────────────────────────

export class WorkflowController {
  constructor(private readonly service: WorkflowApplicationService) {}

  create(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'workflow:create');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const validation = WorkflowRequestValidator.validateCreate(req.body);
      if (!validation.valid || !validation.dto) return validationError(validation.errors, ctx);
      const def = this.service.createWorkflow(validation.dto, orgId);
      return created(WorkflowMapper.toResponse(def, this.service.isActive(def.workflowId)), ctx);
    };
  }

  list(): HttpHandler {
    return async (_req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'workflow:read');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const workflows = this.service.listWorkflows(orgId);
      return ok(workflows.map(w => WorkflowMapper.toResponse(w, this.service.isActive(w.workflowId))), ctx);
    };
  }

  get(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'workflow:read');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const def = this.service.getWorkflow(req.params.workflowId, orgId);
      if (!def) return apiError('WORKFLOW_NOT_FOUND', 'Workflow not found', 404, ctx);
      return ok(WorkflowMapper.toResponse(def, this.service.isActive(def.workflowId)), ctx);
    };
  }

  validate(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'workflow:read');
      if (permCheck) return permCheck;
      const validation = WorkflowRequestValidator.validateCreate(req.body);
      return ok({ valid: validation.valid, errors: validation.errors }, ctx);
    };
  }

  createVersion(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'workflow:create');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const validation = WorkflowRequestValidator.validateCreate(req.body);
      if (!validation.valid || !validation.dto) return validationError(validation.errors, ctx);
      try {
        const def = this.service.createVersion(req.params.workflowId, validation.dto, orgId);
        return created(WorkflowMapper.toResponse(def, false), ctx);
      } catch (err) {
        if ((err as { code?: string }).code === 'WORKFLOW_NOT_FOUND') return apiError('WORKFLOW_NOT_FOUND', 'Workflow not found', 404, ctx);
        throw err;
      }
    };
  }

  activateVersion(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'workflow:publish');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const activated = this.service.activateVersion(req.params.workflowId, req.params.version, orgId);
      if (!activated) return apiError('WORKFLOW_NOT_FOUND', 'Workflow version not found', 404, ctx);
      return ok({ activated: true, version: req.params.version }, ctx);
    };
  }

  deactivate(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'workflow:publish');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const deactivated = this.service.deactivate(req.params.workflowId, orgId);
      if (!deactivated) return apiError('WORKFLOW_NOT_FOUND', 'Workflow not found', 404, ctx);
      return ok({ deactivated: true }, ctx);
    };
  }
}

// ── ApprovalController ──────────────────────────────────────────────────────────

export class ApprovalController {
  constructor(private readonly service: ApprovalApplicationService) {}

  list(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'approval:read');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      let approvals = this.service.getPendingApprovals(orgId);
      // Filters
      if (req.query.executionId) approvals = approvals.filter(a => a.executionId === req.query.executionId);
      if (req.query.status) approvals = approvals.filter(a => a.status === req.query.status);
      const pagination = PaginationValidator.validate(req.query);
      const start = pagination.cursor ? parseInt(pagination.cursor, 10) : 0;
      const slice = approvals.slice(start, start + pagination.limit);
      const hasMore = start + pagination.limit < approvals.length;
      const nextCursor = hasMore ? String(start + pagination.limit) : null;
      return paginated(slice.map(a => ApprovalMapper.toResponse(a)), ctx, nextCursor, hasMore, pagination.limit);
    };
  }

  get(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'approval:read');
      if (permCheck) return permCheck;
      const approval = this.service.getApproval(req.params.approvalId);
      if (!approval) return apiError('APPROVAL_NOT_FOUND', 'Approval not found', 404, ctx);
      const orgId = requireOrg(ctx);
      if (approval.organizationId !== orgId) return apiError('APPROVAL_NOT_FOUND', 'Approval not found', 404, ctx);
      return ok(ApprovalMapper.toResponse(approval), ctx);
    };
  }

  approve(): HttpHandler {
    return this.decide('APPROVED');
  }

  reject(): HttpHandler {
    return this.decide('REJECTED');
  }

  requestChanges(): HttpHandler {
    return this.decide('CHANGES_REQUESTED');
  }

  private decide(decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'approval:decide');
      if (permCheck) return permCheck;
      const orgId = requireOrg(ctx);
      const approval = this.service.getApproval(req.params.approvalId);
      if (!approval) return apiError('APPROVAL_NOT_FOUND', 'Approval not found', 404, ctx);
      if (approval.organizationId !== orgId) return apiError('APPROVAL_NOT_FOUND', 'Approval not found', 404, ctx);
      const validation = ApprovalRequestValidator.validateDecision(req.body);
      if (!validation.valid || !validation.dto) return validationError(validation.errors, ctx);
      try {
        const updated = this.service.decide(req.params.approvalId, decision, ctx.actorId ?? 'unknown', validation.dto.comment);
        return ok(ApprovalMapper.toResponse(updated), ctx);
      } catch (err) {
        const code = (err as { code?: string }).code ?? 'INTERNAL_ERROR';
        const status = (err as { httpStatus?: number }).httpStatus ?? 500;
        return apiError(code, (err as Error).message, status, ctx);
      }
    };
  }
}

// ── TelemetryController ─────────────────────────────────────────────────────────

export class TelemetryController {
  constructor(private readonly service: TelemetryApplicationService) {}

  getEvents(): HttpHandler {
    return async (req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      const permCheck = requirePermission(ctx, 'telemetry:read');
      if (permCheck) return permCheck;
      const events = this.service.getEvents(req.params.executionId);
      return ok(events.map(e => TelemetryMapper.toEventResponse(e)), ctx);
    };
  }
}

// ── CapabilityController ────────────────────────────────────────────────────────

export class CapabilityController {
  constructor(private readonly service: CapabilityApplicationService) {}

  getCapabilities(): HttpHandler {
    return async (_req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      return ok(this.service.getCapabilities(), ctx);
    };
  }
}

// ── HealthController ────────────────────────────────────────────────────────────

export class HealthController {
  getHealth(): HttpHandler {
    return async (_req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      return ok({
        status: 'healthy',
        services: { runtime: 'up', intelligence: 'up', memory: 'up' },
        version: '1.0.0',
      }, ctx);
    };
  }

  getReady(): HttpHandler {
    return async (_req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      return ok({ ready: true, checks: { runtime: true, intelligence: true } }, ctx);
    };
  }

  getVersion(): HttpHandler {
    return async (_req: HttpRequest, ctx: RequestContext): Promise<HttpResponse> => {
      return ok({ apiVersion: 'v1', runtimeVersion: '1.0.0', buildDate: '2026-07-22' }, ctx);
    };
  }

  getOpenApi(): HttpHandler {
    return async (_req: HttpRequest, _ctx: RequestContext): Promise<HttpResponse> => {
      return { status: 200, headers: { 'Content-Type': 'application/yaml' }, body: getOpenApiSpec() };
    };
  }
}
