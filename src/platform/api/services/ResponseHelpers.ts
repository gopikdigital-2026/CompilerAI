// ─── API response helpers ───────────────────────────────────────────────────────

import type { HttpResponse, RequestContext } from '../interfaces/HttpInterfaces';
import type {
  ApiMetaDto, ApiErrorResponseDto, PaginatedResponseDto,
} from '../dto/ApiDtos';

export function ok<T>(data: T, ctx: RequestContext): HttpResponse {
  return json(200, { data, meta: makeMeta(ctx) });
}

export function created<T>(data: T, ctx: RequestContext): HttpResponse {
  return json(201, { data, meta: makeMeta(ctx) });
}

export function accepted<T>(data: T, ctx: RequestContext): HttpResponse {
  return json(202, { data, meta: makeMeta(ctx) });
}

export function noContent(ctx: RequestContext): HttpResponse {
  void ctx;
  return { status: 204, headers: {}, body: undefined };
}

export function paginated<T>(data: T[], ctx: RequestContext, nextCursor: string | null, hasMore: boolean, limit: number): HttpResponse {
  const body: PaginatedResponseDto<T> = {
    data,
    pagination: { nextCursor, hasMore, limit },
    meta: makeMeta(ctx),
  };
  return json(200, body);
}

export function apiError(
  code: string, message: string, httpStatus: number, ctx: RequestContext,
  details: unknown[] = [], retryable = false,
): HttpResponse {
  const body: ApiErrorResponseDto = {
    error: { code, message, details, retryable },
    meta: makeMeta(ctx),
  };
  return json(httpStatus, body);
}

export function notFound(resource: string, ctx: RequestContext): HttpResponse {
  return apiError('RESOURCE_NOT_FOUND', `${resource} not found`, 404, ctx);
}

export function validationError(errors: string[], ctx: RequestContext): HttpResponse {
  return apiError('VALIDATION_ERROR', 'Request validation failed', 400, ctx, errors);
}

function makeMeta(ctx: RequestContext): ApiMetaDto {
  return {
    requestId: ctx.requestId,
    correlationId: ctx.correlationId,
    timestamp: new Date().toISOString(),
    apiVersion: 'v1',
  };
}

function json(status: number, body: unknown): HttpResponse {
  return {
    status,
    headers: { 'Content-Type': 'application/json' },
    body,
  };
}
