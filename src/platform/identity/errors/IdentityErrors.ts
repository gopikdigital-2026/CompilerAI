// ─── Identity layer errors ──────────────────────────────────────────────────────
// Safe-to-expose identity errors. No credentials, tokens, or secrets leak.

export class IdentityError extends Error {
  readonly code: string;
  readonly statusCode: number;
  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = 'IdentityError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AuthenticationError extends IdentityError {
  constructor(message = 'Authentication failed') {
    super('AUTHENTICATION_ERROR', message, 401);
    this.name = 'AuthenticationError';
  }
}

export class InvalidCredentialsError extends IdentityError {
  constructor(message = 'Invalid email or password') {
    super('INVALID_CREDENTIALS', message, 401);
    this.name = 'InvalidCredentialsError';
  }
}

export class TokenExpiredError extends IdentityError {
  constructor(message = 'Token has expired') {
    super('TOKEN_EXPIRED', message, 401);
    this.name = 'TokenExpiredError';
  }
}

export class TokenInvalidError extends IdentityError {
  constructor(message = 'Token is invalid') {
    super('TOKEN_INVALID', message, 401);
    this.name = 'TokenInvalidError';
  }
}

export class ApiKeyInvalidError extends IdentityError {
  constructor(message = 'API key is invalid') {
    super('API_KEY_INVALID', message, 401);
    this.name = 'ApiKeyInvalidError';
  }
}

export class ApiKeyRevokedError extends IdentityError {
  constructor(message = 'API key has been revoked') {
    super('API_KEY_REVOKED', message, 401);
    this.name = 'ApiKeyRevokedError';
  }
}

export class ApiKeyExpiredError extends IdentityError {
  constructor(message = 'API key has expired') {
    super('API_KEY_EXPIRED', message, 401);
    this.name = 'ApiKeyExpiredError';
  }
}

export class AuthorizationError extends IdentityError {
  constructor(message = 'Access denied') {
    super('AUTHORIZATION_ERROR', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class InsufficientPermissionsError extends IdentityError {
  readonly requiredPermissions: string[];
  constructor(requiredPermissions: string[], message?: string) {
    super('INSUFFICIENT_PERMISSIONS', message ?? `Missing permissions: ${requiredPermissions.join(', ')}`, 403);
    this.name = 'InsufficientPermissionsError';
    this.requiredPermissions = requiredPermissions;
  }
}

export class WrongOrganizationError extends IdentityError {
  constructor(message = 'Resource does not belong to your organization') {
    super('WRONG_ORGANIZATION', message, 403);
    this.name = 'WrongOrganizationError';
  }
}

export class AccountLockedError extends IdentityError {
  readonly lockedUntil: string | null;
  constructor(lockedUntil: string | null, message?: string) {
    super('ACCOUNT_LOCKED', message ?? 'Account is temporarily locked due to failed login attempts', 423);
    this.name = 'AccountLockedError';
    this.lockedUntil = lockedUntil;
  }
}

export class AccountSuspendedError extends IdentityError {
  constructor(message = 'Account is suspended') {
    super('ACCOUNT_SUSPENDED', message, 403);
    this.name = 'AccountSuspendedError';
  }
}

export class AccountDisabledError extends IdentityError {
  constructor(message = 'Account is disabled') {
    super('ACCOUNT_DISABLED', message, 403);
    this.name = 'AccountDisabledError';
  }
}

export class OrganizationSuspendedError extends IdentityError {
  constructor(message = 'Organization is suspended') {
    super('ORGANIZATION_SUSPENDED', message, 403);
    this.name = 'OrganizationSuspendedError';
  }
}

export class InvitationExpiredError extends IdentityError {
  constructor(message = 'Invitation has expired') {
    super('INVITATION_EXPIRED', message, 410);
    this.name = 'InvitationExpiredError';
  }
}

export class InvitationRevokedError extends IdentityError {
  constructor(message = 'Invitation has been revoked') {
    super('INVITATION_REVOKED', message, 410);
    this.name = 'InvitationRevokedError';
  }
}

export class SessionExpiredError extends IdentityError {
  constructor(message = 'Session has expired') {
    super('SESSION_EXPIRED', message, 401);
    this.name = 'SessionExpiredError';
  }
}

export class PrivilegeEscalationError extends IdentityError {
  constructor(message = 'Privilege escalation attempt detected') {
    super('PRIVILEGE_ESCALATION', message, 403);
    this.name = 'PrivilegeEscalationError';
  }
}

export function toSafeIdentityMessage(err: unknown): string {
  if (err instanceof IdentityError) return err.message;
  return 'An identity error occurred.';
}

export function isIdentityError(err: unknown): boolean {
  return err instanceof IdentityError;
}
