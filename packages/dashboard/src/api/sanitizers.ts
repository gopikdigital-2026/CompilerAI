const SECRET_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9]{16,}/g,
  /Bearer\s+[a-zA-Z0-9._-]+/g,
  /[a-zA-Z0-9]{32,}/g,
];

const SENSITIVE_KEYS = /^(api[_-]?key|token|secret|password|bearer|authorization)$/i;

const MAX_ERROR_LENGTH = 300;

export function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  if (sanitized.length > MAX_ERROR_LENGTH) {
    sanitized = sanitized.slice(0, MAX_ERROR_LENGTH) + '...';
  }
  return sanitized;
}

export function sanitizeTraceSummary(summary: string): string {
  return sanitizeErrorMessage(summary);
}

export function sanitizeObject<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject) as T;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export function sanitizeError(error: unknown): Error {
  if (error instanceof Error) {
    return new Error(sanitizeErrorMessage(error.message));
  }
  if (typeof error === 'string') {
    return new Error(sanitizeErrorMessage(error));
  }
  return new Error('An unknown error occurred');
}
