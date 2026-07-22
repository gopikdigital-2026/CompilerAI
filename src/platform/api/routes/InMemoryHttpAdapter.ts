// ─── In-memory HTTP adapter ─────────────────────────────────────────────────────
// For testing without a real HTTP server. Implements IHttpAdapter.

import type { IHttpAdapter, HttpRequest, HttpResponse } from '../interfaces/HttpInterfaces';
import type { IRouteRegistry } from '../interfaces/HttpInterfaces';
import type { IAuthenticationProvider } from '../auth/AuthInterfaces';
import type { IdempotencyService } from '../services/IdempotencyService';
import type { IRateLimiter } from '../middleware/RateLimitMiddleware';
import { isRetryable } from '../errors/ApiErrorCodes';

export interface InMemoryHttpAdapterDeps {
  routes:          IRouteRegistry;
  authProvider:    IAuthenticationProvider;
  idempotency:     IdempotencyService;
  rateLimiter:     IRateLimiter;
  clock:           () => string;
  idGenerator:     () => string;
  rateLimitPerOrg: number;
  rateLimitWindowMs: number;
}

const PUBLIC_PATHS = ['/api/v1/health', '/api/v1/ready', '/api/v1/version', '/api/v1/openapi'];
const MUTABLE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class InMemoryHttpAdapter implements IHttpAdapter {
  private readonly deps: InMemoryHttpAdapterDeps;

  constructor(deps: InMemoryHttpAdapterDeps) {
    this.deps = deps;
  }

  async listen(_port: number): Promise<void> { /* no-op in memory */ }
  async close(): Promise<void> { /* no-op */ }

  async handleRequest(req: HttpRequest): Promise<HttpResponse> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] ?? this.deps.idGenerator();
    const correlationId = req.headers['x-correlation-id'] ?? requestId;
    const now = this.deps.clock();

    // Match route
    const match = this.deps.routes.match(req.method, req.path);
    if (!match) {
      return this.errorResponse(404, 'RESOURCE_NOT_FOUND', 'Endpoint not found.', requestId, correlationId, now);
    }

    const { handler, params } = match;
    const reqWithParams = { ...req, params };

    // Check if public endpoint
    const isPublic = PUBLIC_PATHS.some(p => req.path.startsWith(p));

    // Authentication
    let organizationId: string | null = null;
    let actorId: string | null = null;
    let roles: string[] = [];
    let permissions: string[] = [];

    if (!isPublic) {
      const principal = await this.deps.authProvider.authenticate(req);
      if (!principal) {
        return this.errorResponse(401, 'AUTHENTICATION_REQUIRED', 'Authentication required.', requestId, correlationId, now);
      }
      organizationId = principal.organizationId;
      actorId = principal.actorId;
      roles = principal.roles;
      permissions = principal.permissions;

      // Rate limiting
      const rateKey = `${organizationId}:${req.method}:${req.path}`;
      const rateResult = this.deps.rateLimiter.check(rateKey, this.deps.rateLimitPerOrg, this.deps.rateLimitWindowMs);
      if (!rateResult.allowed) {
        return this.errorResponse(429, 'RATE_LIMIT_EXCEEDED', 'Rate limit exceeded.', requestId, correlationId, now, [
          { remaining: rateResult.remaining, resetAt: rateResult.resetAt },
        ]);
      }
    }

    const ctx = {
      requestId, correlationId, organizationId, actorId, roles, permissions, startTime,
    };

    try {
      // Idempotency check for mutable operations
      if (MUTABLE_METHODS.has(req.method.toUpperCase()) && !isPublic) {
        const idemKey = req.headers['idempotency-key'];
        if (idemKey && organizationId) {
          const requestHash = this.deps.idempotency.computeRequestHash(req.body);
          const check = this.deps.idempotency.checkOrStore(organizationId, idemKey, requestHash);
          if (check.duplicate && check.record) {
            if (check.record.requestHash !== requestHash) {
              return this.errorResponse(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key reused with different body.', requestId, correlationId, now);
            }
            // Return cached response
            return {
              status: check.record.statusCode,
              headers: { 'Content-Type': 'application/json' },
              body: check.record.response,
            };
          }
        }
      }

      const response = await handler(reqWithParams, ctx);

      // Store idempotency record for successful mutable operations
      if (MUTABLE_METHODS.has(req.method.toUpperCase()) && !isPublic && organizationId) {
        const idemKey = req.headers['idempotency-key'];
        if (idemKey && response.status < 400) {
          const requestHash = this.deps.idempotency.computeRequestHash(req.body);
          this.deps.idempotency.store(organizationId, idemKey, requestHash, response.body, response.status);
        }
      }

      return response;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      const code = (err as { code?: string }).code ?? 'INTERNAL_ERROR';
      const status = (err as { httpStatus?: number }).httpStatus ?? 500;
      return this.errorResponse(status, code as never, message, requestId, correlationId, now);
    }
  }

  private errorResponse(
    status: number,
    code: string,
    message: string,
    requestId: string,
    correlationId: string,
    now: string,
    details: unknown[] = [],
  ): HttpResponse {
    return {
      status,
      headers: { 'Content-Type': 'application/json' },
      body: {
        error: { code, message, details, retryable: isRetryable(code as never) },
        meta: { requestId, correlationId, timestamp: now, apiVersion: 'v1' },
      },
    };
  }
}
