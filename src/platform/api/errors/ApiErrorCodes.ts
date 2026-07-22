// ─── API error codes ────────────────────────────────────────────────────────────

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_REQUIRED'
  | 'ACCESS_DENIED'
  | 'ORGANIZATION_MISMATCH'
  | 'RESOURCE_NOT_FOUND'
  | 'EXECUTION_NOT_FOUND'
  | 'WORKFLOW_NOT_FOUND'
  | 'APPROVAL_NOT_FOUND'
  | 'INVALID_EXECUTION_STATE'
  | 'INVALID_RESUME_TOKEN'
  | 'IDEMPOTENCY_CONFLICT'
  | 'WORKFLOW_VALIDATION_FAILED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'REQUEST_TIMEOUT'
  | 'RUNTIME_UNAVAILABLE'
  | 'INTERNAL_ERROR';

export interface ApiErrorDef {
  code:      ApiErrorCode;
  message:   string;
  httpStatus: number;
  retryable: boolean;
}

const ERROR_DEFS: Record<ApiErrorCode, Omit<ApiErrorDef, 'message'>> = {
  VALIDATION_ERROR:          { code: 'VALIDATION_ERROR',          httpStatus: 400, retryable: false },
  AUTHENTICATION_REQUIRED:   { code: 'AUTHENTICATION_REQUIRED',   httpStatus: 401, retryable: false },
  ACCESS_DENIED:             { code: 'ACCESS_DENIED',             httpStatus: 403, retryable: false },
  ORGANIZATION_MISMATCH:     { code: 'ORGANIZATION_MISMATCH',     httpStatus: 403, retryable: false },
  RESOURCE_NOT_FOUND:        { code: 'RESOURCE_NOT_FOUND',        httpStatus: 404, retryable: false },
  EXECUTION_NOT_FOUND:       { code: 'EXECUTION_NOT_FOUND',       httpStatus: 404, retryable: false },
  WORKFLOW_NOT_FOUND:        { code: 'WORKFLOW_NOT_FOUND',        httpStatus: 404, retryable: false },
  APPROVAL_NOT_FOUND:        { code: 'APPROVAL_NOT_FOUND',        httpStatus: 404, retryable: false },
  INVALID_EXECUTION_STATE:   { code: 'INVALID_EXECUTION_STATE',  httpStatus: 409, retryable: false },
  INVALID_RESUME_TOKEN:      { code: 'INVALID_RESUME_TOKEN',      httpStatus: 409, retryable: false },
  IDEMPOTENCY_CONFLICT:      { code: 'IDEMPOTENCY_CONFLICT',      httpStatus: 409, retryable: false },
  WORKFLOW_VALIDATION_FAILED:{ code: 'WORKFLOW_VALIDATION_FAILED',httpStatus: 422, retryable: false },
  RATE_LIMIT_EXCEEDED:       { code: 'RATE_LIMIT_EXCEEDED',       httpStatus: 429, retryable: true  },
  REQUEST_TIMEOUT:           { code: 'REQUEST_TIMEOUT',           httpStatus: 408, retryable: true  },
  RUNTIME_UNAVAILABLE:       { code: 'RUNTIME_UNAVAILABLE',       httpStatus: 503, retryable: true  },
  INTERNAL_ERROR:            { code: 'INTERNAL_ERROR',            httpStatus: 500, retryable: false },
};

export function getErrorDef(code: ApiErrorCode): Omit<ApiErrorDef, 'message'> {
  return ERROR_DEFS[code];
}

export function getHttpStatus(code: ApiErrorCode): number {
  return ERROR_DEFS[code]?.httpStatus ?? 500;
}

export function isRetryable(code: ApiErrorCode): boolean {
  return ERROR_DEFS[code]?.retryable ?? false;
}
