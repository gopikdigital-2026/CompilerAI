import type { ApiErrorBody, ApiMeta } from '../types';

export abstract class CompilerAIError extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;
  abstract readonly retryable: boolean;
  readonly details: ApiErrorBody['details'];
  readonly meta: ApiMeta | null;

  constructor(message: string, opts?: { details?: ApiErrorBody['details']; meta?: ApiMeta | null; cause?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    this.details = opts?.details ?? [];
    this.meta = opts?.meta ?? null;
  }

  toSafeObject(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
      retryable: this.retryable,
      details: this.details,
      requestId: this.meta?.requestId ?? null,
      correlationId: this.meta?.correlationId ?? null,
    };
  }
}

export class AuthenticationError extends CompilerAIError {
  readonly code = 'AUTHENTICATION_REQUIRED';
  readonly httpStatus = 401;
  readonly retryable = false;
}

export class AuthorizationError extends CompilerAIError {
  readonly code = 'ACCESS_DENIED';
  readonly httpStatus = 403;
  readonly retryable = false;
}

export class ValidationError extends CompilerAIError {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;
  readonly retryable = false;
}

export class NotFoundError extends CompilerAIError {
  readonly code = 'RESOURCE_NOT_FOUND';
  readonly httpStatus = 404;
  readonly retryable = false;
}

export class ConflictError extends CompilerAIError {
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;
  readonly retryable = false;
}

export class RateLimitError extends CompilerAIError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly httpStatus = 429;
  readonly retryable = true;
}

export class TimeoutError extends CompilerAIError {
  readonly code = 'REQUEST_TIMEOUT';
  readonly httpStatus = 408;
  readonly retryable = true;
}

export class NetworkError extends CompilerAIError {
  readonly code = 'NETWORK_ERROR';
  readonly httpStatus = 0;
  readonly retryable = true;
}

export class ServerError extends CompilerAIError {
  readonly code = 'INTERNAL_ERROR';
  readonly httpStatus = 500;
  readonly retryable = true;
}

const CODE_TO_CLASS: Record<string, new (msg: string, opts?: { details?: ApiErrorBody['details']; meta?: ApiMeta | null }) => CompilerAIError> = {
  AUTHENTICATION_REQUIRED: AuthenticationError,
  ACCESS_DENIED: AuthorizationError,
  ORGANIZATION_MISMATCH: AuthorizationError,
  VALIDATION_ERROR: ValidationError,
  WORKFLOW_VALIDATION_FAILED: ValidationError,
  RESOURCE_NOT_FOUND: NotFoundError,
  EXECUTION_NOT_FOUND: NotFoundError,
  WORKFLOW_NOT_FOUND: NotFoundError,
  APPROVAL_NOT_FOUND: NotFoundError,
  INVALID_EXECUTION_STATE: ConflictError,
  INVALID_RESUME_TOKEN: ConflictError,
  IDEMPOTENCY_CONFLICT: ConflictError,
  RATE_LIMIT_EXCEEDED: RateLimitError,
  REQUEST_TIMEOUT: TimeoutError,
  RUNTIME_UNAVAILABLE: ServerError,
  INTERNAL_ERROR: ServerError,
};

export function fromApiError(body: ApiErrorBody, meta: ApiMeta | null): CompilerAIError {
  const Cls = CODE_TO_CLASS[body.code] ?? ServerError;
  return new Cls(body.message, { details: body.details, meta });
}

export function isCompilerAIError(e: unknown): e is CompilerAIError {
  return e instanceof CompilerAIError;
}

export { CompilerAIError as default };
