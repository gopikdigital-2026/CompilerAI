// ─── Memory errors ──────────────────────────────────────────────────────────────

export class MemoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryError';
  }
}

export class SensitiveDataBlockedError extends MemoryError {
  constructor(message = 'Sensitive data storage blocked: no explicit consent granted.') {
    super(message);
    this.name = 'SensitiveDataBlockedError';
  }
}

export class MemoryValidationError extends MemoryError {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryValidationError';
  }
}

export class MemoryNotFoundError extends MemoryError {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryNotFoundError';
  }
}

export class DuplicateMemoryError extends MemoryError {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateMemoryError';
  }
}

export class TenantIsolationError extends MemoryError {
  constructor(message = 'Tenant isolation violated: cross-organization memory access denied.') {
    super(message);
    this.name = 'TenantIsolationError';
  }
}
