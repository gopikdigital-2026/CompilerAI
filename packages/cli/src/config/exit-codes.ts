export const enum ExitCode {
  Success = 0,
  GenericError = 1,
  ConfigError = 2,
  AuthenticationError = 3,
  NotFound = 4,
  ValidationError = 5,
  NetworkError = 6,
  Cancelled = 7,
  Timeout = 8,
}

export function exitCodeFromError(error: unknown): number {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: string }).code;
    switch (code) {
    case 'AUTHENTICATION_REQUIRED': return ExitCode.AuthenticationError;
    case 'ACCESS_DENIED': return ExitCode.AuthenticationError;
    case 'VALIDATION_ERROR': return ExitCode.ValidationError;
    case 'WORKFLOW_VALIDATION_FAILED': return ExitCode.ValidationError;
    case 'RESOURCE_NOT_FOUND':
    case 'EXECUTION_NOT_FOUND':
    case 'WORKFLOW_NOT_FOUND':
    case 'APPROVAL_NOT_FOUND':
      return ExitCode.NotFound;
    case 'RATE_LIMIT_EXCEEDED': return ExitCode.NetworkError;
    case 'REQUEST_TIMEOUT': return ExitCode.Timeout;
    case 'NETWORK_ERROR': return ExitCode.NetworkError;
    case 'CONFLICT':
    case 'INVALID_EXECUTION_STATE':
    case 'INVALID_RESUME_TOKEN':
    case 'IDEMPOTENCY_CONFLICT':
      return ExitCode.GenericError;
    case 'INTERNAL_ERROR': return ExitCode.GenericError;
    }
  }
  return ExitCode.GenericError;
}
